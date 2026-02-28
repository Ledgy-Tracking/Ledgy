import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { WidgetConfig } from './widgets';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useNodeStore } from '../../stores/useNodeStore';

interface WidgetConfigSheetProps {
    widget: WidgetConfig | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const WidgetConfigSheet: React.FC<WidgetConfigSheetProps> = ({
    widget,
    open,
    onOpenChange,
}) => {
    const { updateWidget } = useDashboardStore();
    const { nodes } = useNodeStore();
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'chart' | 'trend' | 'text'>('text');
    const [nodeId, setNodeId] = useState<string | undefined>(undefined);

    // List of available output nodes
    const outputNodes = nodes.filter((n: any) => n.type === 'dashboardOutput');

    useEffect(() => {
        if (widget) {
            setTitle(widget.title);
            setType(widget.type);
            setNodeId(widget.nodeId);
        }
    }, [widget]);

    const handleSave = () => {
        if (widget) {
            updateWidget(widget.id, { title, type, nodeId });
        }
        onOpenChange(false);
    };

    if (!widget) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
                <SheetHeader>
                    <SheetTitle className="text-zinc-50">Widget Configuration</SheetTitle>
                    <SheetDescription className="text-zinc-400">
                        Customize how this widget displays its data.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    <div className="space-y-2">
                        <Label htmlFor="widget-title" className="text-zinc-300">Widget Title</Label>
                        <Input
                            id="widget-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-zinc-100"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="widget-source" className="text-zinc-300">Data Source (Node)</Label>
                        <Select value={nodeId || 'none'} onValueChange={(v) => setNodeId(v === 'none' ? undefined : v)}>
                            <SelectTrigger id="widget-source" className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                <SelectValue placeholder="Select a node..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                <SelectItem value="none">Manual / Unlinked</SelectItem>
                                {outputNodes.map((node: any) => (
                                    <SelectItem key={node.id} value={node.id}>
                                        {(node.data as any).title || node.id.slice(-8)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-zinc-500">Pick a Dashboard Output node from the Node Forge.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="widget-type" className="text-zinc-300">Display Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as any)}>
                            <SelectTrigger id="widget-type" className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                                <SelectItem value="text">Text (Value Only)</SelectItem>
                                <SelectItem value="trend">Trend (Value + Change)</SelectItem>
                                <SelectItem value="chart">Chart (Historical Data)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleSave}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};