import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Edit, Trash2, Shield } from 'lucide-react';
import { z } from 'zod';

interface AppUser {
  id: string;
  username: string;
  created_at: string;
  role?: 'produzione' | 'amministratore';
}

const userSchema = z.object({
  username: z.string().trim().min(3, 'Username deve essere almeno 3 caratteri').max(50, 'Username troppo lungo'),
  password: z.string().min(6, 'Password deve essere almeno 6 caratteri').max(100, 'Password troppo lunga'),
  role: z.enum(['produzione', 'amministratore'], { required_error: 'Seleziona un ruolo' }),
});

export default function GestioneUtenti() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '' as 'produzione' | 'amministratore' | '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    caricaUtenti();
  }, []);

  const caricaUtenti = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('id, username, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Carica i ruoli per ogni utente
      const usersWithRoles = await Promise.all(
        (usersData || []).map(async (u) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', u.id)
            .maybeSingle();

          return {
            ...u,
            role: roleData?.role as 'produzione' | 'amministratore' | undefined,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
      toast.error('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const apriModalNuovo = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const apriModalModifica = (utente: AppUser) => {
    setEditingUser(utente);
    setFormData({ username: utente.username, password: '', role: utente.role || '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const chiudiModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', role: '' });
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validazione
    const dataToValidate = editingUser && !formData.password
      ? { ...formData, password: 'dummy123456' } // Password placeholder per modifica senza cambio password
      : formData;

    const validation = userSchema.safeParse(dataToValidate);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      if (editingUser) {
        // Modifica utente esistente
        await modificaUtente();
      } else {
        // Crea nuovo utente
        await creaUtente();
      }
    } catch (error) {
      console.error('Errore salvataggio utente:', error);
      toast.error('Errore nel salvataggio dell\'utente');
    } finally {
      setSubmitting(false);
    }
  };

  const creaUtente = async () => {
    try {
      // Genera hash password
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(formData.password, 10);

      // Inserisci utente
      const { data: newUser, error: userError } = await supabase
        .from('app_users')
        .insert({ username: formData.username, password_hash: passwordHash })
        .select()
        .single();

      if (userError) {
        if (userError.code === '23505') {
          toast.error('Username già esistente');
          return;
        }
        throw userError;
      }

      // Assegna ruolo
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUser.id, role: formData.role });

      if (roleError) throw roleError;

      toast.success('Utente creato con successo');
      chiudiModal();
      caricaUtenti();
    } catch (error) {
      throw error;
    }
  };

  const modificaUtente = async () => {
    if (!editingUser) return;

    try {
      // Aggiorna username se cambiato
      if (formData.username !== editingUser.username) {
        const { error: updateError } = await supabase
          .from('app_users')
          .update({ username: formData.username })
          .eq('id', editingUser.id);

        if (updateError) {
          if (updateError.code === '23505') {
            toast.error('Username già esistente');
            return;
          }
          throw updateError;
        }
      }

      // Aggiorna password se fornita
      if (formData.password) {
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(formData.password, 10);

        const { error: passwordError } = await supabase
          .from('app_users')
          .update({ password_hash: passwordHash })
          .eq('id', editingUser.id);

        if (passwordError) throw passwordError;
      }

      // Aggiorna ruolo se cambiato
      if (formData.role !== editingUser.role) {
        // Elimina vecchio ruolo
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);

        // Inserisci nuovo ruolo
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: editingUser.id, role: formData.role });

        if (roleError) throw roleError;
      }

      toast.success('Utente modificato con successo');
      chiudiModal();
      caricaUtenti();
    } catch (error) {
      throw error;
    }
  };

  const confermaEliminazione = (utente: AppUser) => {
    setUserToDelete(utente);
    setDeleteModalOpen(true);
  };

  const eliminaUtente = async () => {
    if (!userToDelete) return;

    try {
      // Verifica se l'utente sta eliminando se stesso
      if (userToDelete.id === user?.id) {
        toast.error('Non puoi eliminare il tuo account mentre sei loggato');
        return;
      }

      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      toast.success('Utente eliminato con successo');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      caricaUtenti();
    } catch (error) {
      console.error('Errore eliminazione utente:', error);
      toast.error('Errore nell\'eliminazione dell\'utente');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Gestione Utenti</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Amministratore: <strong>{user?.username}</strong>
            </span>
            <Button variant="outline" onClick={logout}>
              Esci
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-muted-foreground">
            Gestisci gli utenti del sistema: crea, modifica ed elimina account.
          </p>
          <Button onClick={apriModalNuovo} size="lg" className="gap-2">
            <UserPlus className="h-5 w-5" />
            Nuovo Utente
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Caricamento utenti...</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((utente) => (
                  <TableRow key={utente.id}>
                    <TableCell className="font-medium">{utente.username}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          utente.role === 'amministratore'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {utente.role === 'amministratore' ? 'Amministratore' : 'Produzione'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(utente.created_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => apriModalModifica(utente)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => confermaEliminazione(utente)}
                          disabled={utente.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal Crea/Modifica */}
      <Dialog open={modalOpen} onOpenChange={chiudiModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifica i dati dell\'utente. Lascia la password vuota per non cambiarla.'
                : 'Inserisci i dati del nuovo utente.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Inserisci username"
                disabled={submitting}
              />
              {formErrors.username && (
                <p className="text-sm text-destructive mt-1">{formErrors.username}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">
                Password {editingUser && '(lascia vuoto per non cambiare)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Nuova password (opzionale)' : 'Inserisci password'}
                disabled={submitting}
              />
              {formErrors.password && (
                <p className="text-sm text-destructive mt-1">{formErrors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="role">Ruolo</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'produzione' | 'amministratore') =>
                  setFormData({ ...formData, role: value })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="produzione">Produzione</SelectItem>
                  <SelectItem value="amministratore">Amministratore</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-sm text-destructive mt-1">{formErrors.role}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={chiudiModal} disabled={submitting}>
                Annulla
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvataggio...' : editingUser ? 'Salva Modifiche' : 'Crea Utente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Conferma Eliminazione */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare l'utente <strong>{userToDelete?.username}</strong>?
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={eliminaUtente}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
