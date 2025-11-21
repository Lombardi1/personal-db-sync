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
import * as notifications from '@/utils/notifications'; // Aggiornato a percorso relativo
import { UserPlus, Edit, Trash2, Home } from 'lucide-react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';

interface AppUser {
  id: string;
  username: string;
  created_at: string;
  role?: 'stampa' | 'amministratore'; // Ruolo aggiornato
}

const userSchema = z.object({
  username: z.string().trim().min(3, 'Username deve essere almeno 3 caratteri').max(50, 'Username troppo lungo'),
  password: z.string().min(6, 'Password deve essere almeno 6 caratteri').max(100, 'Password troppo lunga'),
  role: z.enum(['stampa', 'amministratore'], { required_error: 'Seleziona un ruolo' }), // Ruolo aggiornato
});

export default function GestioneUtenti() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '' as 'stampa' | 'amministratore' | '', // Ruolo aggiornato
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setLoadingSubmit] = useState(false);

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

      const usersWithRoles = await Promise.all(
        (usersData || []).map(async (u) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', u.id)
            .maybeSingle();

          return {
            ...u,
            role: roleData?.role as 'stampa' | 'amministratore' | undefined, // Ruolo aggiornato
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
      notifications.showError('Errore nel caricamento degli utenti');
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

    const dataToValidate = editingUser && !formData.password
      ? { ...formData, password: 'dummy123456' }
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

    setLoadingSubmit(true);

    try {
      if (editingUser) {
        await modificaUtente();
      } else {
        await creaUtente();
      }
    } catch (error: any) { // Cattura l'errore per loggarlo
      console.error('Errore salvataggio utente:', error);
      notifications.showError(`Errore nel salvataggio dell'utente: ${error.message || 'Errore sconosciuto'}`);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const creaUtente = async () => {
    try {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(formData.password, 10);

      const { data: newUser, error: userError } = await supabase
        .from('app_users')
        .insert({ username: formData.username, password_hash: passwordHash })
        .select()
        .single();

      if (userError) {
        if (userError.code === '23505') {
          notifications.showError('Username già esistente');
          throw new Error('Username già esistente'); // Rilancia un errore con messaggio specifico
        }
        throw userError;
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUser.id, role: formData.role });

      if (roleError) throw roleError;

      notifications.showSuccess('Utente creato con successo');
      chiudiModal();
      caricaUtenti();
    } catch (error) {
      throw error;
    }
  };

  const modificaUtente = async () => {
    if (!editingUser) return;

    try {
      if (formData.username !== editingUser.username) {
        const { error: updateError } = await supabase
          .from('app_users')
          .update({ username: formData.username })
          .eq('id', editingUser.id);

        if (updateError) {
          if (updateError.code === '23505') {
            notifications.showError('Username già esistente');
            throw new Error('Username già esistente'); // Rilancia un errore con messaggio specifico
          }
          throw updateError;
        }
      }

      if (formData.password) {
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(formData.password, 10);

        const { error: passwordError } = await supabase
          .from('app_users')
          .update({ password_hash: passwordHash })
          .eq('id', editingUser.id);

        if (passwordError) throw passwordError;
      }

      if (formData.role !== editingUser.role) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: editingUser.id, role: formData.role });

        if (roleError) throw roleError;
      }

      notifications.showSuccess('Utente modificato con successo');
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
      if (userToDelete.id === user?.id) {
        notifications.showError('Non puoi eliminare il tuo account mentre sei loggato');
        return;
      }

      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      notifications.showSuccess('Utente eliminato con successo');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      caricaUtenti();
    } catch (error) {
      console.error('Errore eliminazione utente:', error);
      notifications.showError('Errore nell\'eliminazione dell\'utente');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Gestione Utenti" 
        activeTab="gestione-utenti" 
        showUsersButton={true}
      />

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="text-sm">
            <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
            Torna alla Dashboard
          </Button>
        </div>
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <p className="text-sm sm:text-base text-muted-foreground text-center sm:text-left">
            Gestisci gli utenti del sistema: crea, modifica ed elimina account.
          </p>
          <Button 
            onClick={apriModalNuovo} 
            size="sm" 
            className="gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-[hsl(var(--summary-header-color))] hover:bg-[hsl(30,100%,40%)] text-white"
          >
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
            Nuovo Utente
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-muted-foreground">Caricamento utenti...</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Username</TableHead>
                  <TableHead className="text-xs sm:text-sm">Ruolo</TableHead>
                  <TableHead className="text-xs sm:text-sm">Data Creazione</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((utente) => (
                  <TableRow key={utente.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{utente.username}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          utente.role === 'amministratore'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {utente.role === 'amministratore' ? 'Amministratore' : 'Stampa'} {/* Testo aggiornato */}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {new Date(utente.created_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => apriModalModifica(utente)}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => confermaEliminazione(utente)}
                          disabled={utente.id === user?.id}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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

      <Dialog open={modalOpen} onOpenChange={chiudiModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {editingUser
                ? 'Modifica i dati dell\'utente. Lascia la password vuota per non cambiarla.'
                : 'Inserisci i dati del nuovo utente.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="username" className="text-sm">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Inserisci username"
                disabled={submitting}
                className="text-sm"
              />
              {formErrors.username && (
                <p className="text-xs text-destructive mt-1">{formErrors.username}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-sm">
                Password {editingUser && '(lascia vuoto per non cambiare)'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Nuova password (opzionale)' : 'Inserisci password'}
                disabled={submitting}
                className="text-sm"
              />
              {formErrors.password && (
                <p className="text-xs text-destructive mt-1">{formErrors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="role" className="text-sm">Ruolo</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'stampa' | 'amministratore') => // Ruolo aggiornato
                  setFormData({ ...formData, role: value })
                }
                disabled={submitting}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stampa" className="text-sm">Stampa</SelectItem> {/* Testo aggiornato */}
                  <SelectItem value="amministratore" className="text-sm">Amministratore</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-xs text-destructive mt-1">{formErrors.role}</p>
              )}
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={chiudiModal} disabled={submitting} className="w-full sm:w-auto text-sm">
                Annulla
              </Button>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto text-sm">
                {submitting ? 'Salvataggio...' : editingUser ? 'Salva Modifiche' : 'Crea Utente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Conferma Eliminazione</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Sei sicuro di voler eliminare l'utente <strong>{userToDelete?.username}</strong>?
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="w-full sm:w-auto text-sm">
              Annulla
            </Button>
            <Button variant="destructive" onClick={eliminaUtente} className="w-full sm:w-auto text-sm">
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}