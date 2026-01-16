import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { releaseNotes } from '@/config/releaseNotes';
import { Sparkles } from 'lucide-react';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const latestRelease = releaseNotes[0]; // Prende l'ultima versione

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-[hsl(var(--whats-new-color))] text-white p-4 rounded-t-lg -mx-6 -mt-6 mb-4 flex flex-row items-center gap-3">
          <Sparkles className="h-6 w-6" />
          <DialogTitle className="text-xl sm:text-2xl font-bold">Novità del Gestionale</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm sm:text-base text-muted-foreground mb-4">
          Scopri le ultime funzionalità e miglioramenti introdotti nel sistema.
        </DialogDescription>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6">
            {releaseNotes.map((release, index) => (
              <div key={release.version} className="pb-4 border-b last:border-b-0 border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="text-[hsl(var(--whats-new-color))]">v{release.version}</span> - {release.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">{release.date}</p>

                {release.features.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-foreground mb-1">Nuove Funzionalità:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {release.features.map((feature, fIndex) => (
                        <li key={fIndex} dangerouslySetInnerHTML={{ __html: feature }} />
                      ))}
                    </ul>
                  </div>
                )}

                {release.bugFixes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">Correzioni Bug:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {release.bugFixes.map((bug, bIndex) => (
                        <li key={bIndex} dangerouslySetInnerHTML={{ __html: bug }} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button onClick={onClose} className="bg-[hsl(var(--whats-new-color))] hover:bg-[hsl(var(--whats-new-color-dark))] text-white">
            Ho Capito!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}