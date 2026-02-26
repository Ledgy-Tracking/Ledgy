import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from './ui/command';
import { useProfileStore } from '../stores/useProfileStore';
import { useLedgerStore } from '../stores/useLedgerStore';
import { FolderKanban, Network, Database, Settings } from 'lucide-react';

export const CommandPalette: React.FC = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { profiles, activeProfileId } = useProfileStore();
    const { schemas } = useLedgerStore();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    // Depending on routing, projects might just be dashboards or we just navigate to ledger
    // For now we'll support navigating to profiles and active profile ledgers

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                
                {activeProfileId && (
                    <CommandGroup heading="Active Profile Navigation">
                        <CommandItem onSelect={() => runCommand(() => navigate(`/app/${activeProfileId}/projects`))}>
                            <FolderKanban className="mr-2 h-4 w-4" />
                            <span>Projects Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate(`/app/${activeProfileId}/node-forge`))}>
                            <Network className="mr-2 h-4 w-4" />
                            <span>Node Forge</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate(`/app/${activeProfileId}/settings`))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {activeProfileId && schemas.length > 0 && (
                    <CommandGroup heading="Ledgers">
                        {schemas.map((schema) => (
                            <CommandItem
                                key={schema._id}
                                onSelect={() => runCommand(() => navigate(`/app/${activeProfileId}/ledger/${schema._id}`))}
                            >
                                <Database className="mr-2 h-4 w-4" />
                                <span>{schema.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandGroup heading="Switch Profile">
                    {profiles.map((profile) => (
                        <CommandItem
                            key={profile.id}
                            onSelect={() => {
                                runCommand(() => {
                                    useProfileStore.getState().setActiveProfile(profile.id);
                                    navigate(`/app/${profile.id}`);
                                });
                            }}
                        >
                            <span>{profile.name}</span>
                        </CommandItem>
                    ))}
                    <CommandItem onSelect={() => runCommand(() => navigate('/profiles'))}>
                        <span>View All Profiles...</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
};
