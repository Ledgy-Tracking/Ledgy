import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from './ui/command';
import { useProfileStore } from '../stores/useProfileStore';
import { useLedgerStore } from '../stores/useLedgerStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';
import { FolderKanban, Network, Database, Plus, LayoutGrid } from 'lucide-react';

import { useParams } from 'react-router-dom';

export const CommandPalette: React.FC = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { profileId, projectId, ledgerId } = useParams<{ profileId: string; projectId: string; ledgerId: string }>();
    const { profiles } = useProfileStore();
    const { schemas } = useLedgerStore();
    const { projects, setActiveProject } = useProjectStore();
    const { setSchemaBuilderOpen } = useUIStore();

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

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Search projects, ledgers, or type a command..." />
            <CommandList className="custom-scrollbar">
                <CommandEmpty>No results found.</CommandEmpty>

                {profileId && (
                    <CommandGroup heading="Actions">
                        {projectId && (
                            <CommandItem onSelect={() => runCommand(() => navigate(`/app/${profileId}/project/${projectId}/node-forge`))}>
                                <Network className="mr-2 h-4 w-4 text-zinc-400" />
                                <span>Open Node Forge for this Project</span>
                            </CommandItem>
                        )}
                        {ledgerId && (
                            <CommandItem onSelect={() => runCommand(() => {
                                // We'd need to trigger the "Add Entry" UI in LedgerTable
                                // For now, focus the shortcut N
                                console.log('New Entry triggered');
                            })}>
                                <Plus className="mr-2 h-4 w-4 text-zinc-400" />
                                <span>New Entry in this Ledger (N)</span>
                            </CommandItem>
                        )}
                        <CommandItem onSelect={() => runCommand(() => setSchemaBuilderOpen(true))}>
                            <Database className="mr-2 h-4 w-4 text-zinc-400" />
                            <span>Create New Ledger Schema...</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate(`/app/${profileId}/projects`))}>
                            <FolderKanban className="mr-2 h-4 w-4 text-zinc-400" />
                            <span>Create New Project...</span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {profileId && projects.length > 0 && (
                    <CommandGroup heading="Projects">
                        {projects.map((project) => (
                            <CommandItem
                                key={project._id}
                                onSelect={() => runCommand(() => {
                                    setActiveProject(project._id);
                                    navigate(`/app/${profileId}/project/${project._id}`);
                                })}
                            >
                                <LayoutGrid className="mr-2 h-4 w-4 text-zinc-400" />
                                <span>{project.name}</span>
                                {projectId === project._id && (
                                    <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-bold uppercase">Active</span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {profileId && schemas.length > 0 && (
                    <CommandGroup heading="Ledgers">
                        {schemas.map((schema) => (
                            <CommandItem
                                key={schema._id}
                                onSelect={() => runCommand(() => {
                                    const targetProjectId = schema.projectId || projectId;
                                    if (targetProjectId) {
                                        navigate(`/app/${profileId}/project/${targetProjectId}/ledger/${schema._id}`);
                                    } else {
                                        navigate(`/app/${profileId}/ledger/${schema._id}`);
                                    }
                                })}
                            >
                                <Database className="mr-2 h-4 w-4 text-zinc-400" />
                                <span>{schema.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandGroup heading="Profiles">
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
                            <div className={`w-2 h-2 rounded-full mr-3 ${profile.id === profileId ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                            <span>{profile.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
};
