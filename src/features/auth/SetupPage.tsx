import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore, EXPIRY_OPTIONS, RememberMeExpiry, DEFAULT_EXPIRY } from './useAuthStore';
import { generateSecret, encodeSecret, generateOtpauthUri } from '../../lib/totp';

interface SetupFormValues {
    code: string;
    passphrase: string;
}

export const SetupPage: React.FC = () => {
    const [tempSecret, setTempSecret] = useState<string | null>(null);
    const [qrUri, setQrUri] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = React.useRef(false);
    const hasGenerated = React.useRef(false);
    const { verifyAndRegister } = useAuthStore();
    const navigate = useNavigate();

    // Security Options
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [expiryOption, setExpiryOption] = useState<RememberMeExpiry>(DEFAULT_EXPIRY);

    const form = useForm<SetupFormValues>({
        defaultValues: {
            code: '',
            passphrase: '',
        },
    });

    useEffect(() => {
        if (hasGenerated.current) return;
        hasGenerated.current = true;

        // Generate new secret on mount
        const rawSecret = generateSecret();
        const encoded = encodeSecret(rawSecret);
        const uri = generateOtpauthUri(encoded, 'user@ledgy', 'Ledgy');

        setTempSecret(encoded);
        setQrUri(uri);
    }, []);

    const handleVerify = async (verifyCode: string, passphraseValue: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        if (!tempSecret || verifyCode.length !== 6) {
            isSubmittingRef.current = false;
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const selectedExpiry = EXPIRY_OPTIONS.find(o => o.value === expiryOption);
            const expiryMs = selectedExpiry?.ms ?? null;

            const success = await verifyAndRegister(
                tempSecret,
                verifyCode,
                rememberMe,
                passphraseValue.length > 0 ? passphraseValue : undefined,
                expiryMs
            );

            if (success) {
                navigate('/profiles');
            } else {
                setError('Invalid code. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const onSubmit = (data: SetupFormValues) => {
        handleVerify(data.code, data.passphrase);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col items-center justify-center p-4 font-sans">
            <Card className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-emerald-500">Secure Your Ledgy</h1>
                    <p className="text-zinc-400">Scan this QR code with Google Authenticator or any TOTP app.</p>
                </div>

                <div className="flex justify-center bg-white p-4 rounded-xl border-4 border-emerald-500/20">
                    {qrUri && (
                        <QRCodeSVG
                            value={qrUri}
                            size={200}
                            level="M"
                            includeMargin={false}
                        />
                    )}
                </div>

                <div className="space-y-4">
                    <Card className="p-4 bg-white dark:bg-zinc-950/50 rounded-lg border border-zinc-300 dark:border-zinc-800 text-sm font-mono break-all text-zinc-600 dark:text-zinc-500 text-center">
                        <CardContent>
                            Secret: <span className="text-zinc-300">{tempSecret}</span>
                        </CardContent>
                    </Card>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="code"
                                rules={{
                                    required: 'Code is required',
                                    minLength: { value: 6, message: 'Code must be 6 digits' },
                                    maxLength: { value: 6, message: 'Code must be 6 digits' },
                                    pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' },
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="block text-sm font-medium text-zinc-400 text-center">
                                            Enter 6-digit confirmation code
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="text"
                                                maxLength={6}
                                                disabled={isSubmitting}
                                                placeholder="000000"
                                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-4 text-center text-3xl tracking-widest text-zinc-900 dark:text-zinc-50 font-mono"
                                                autoFocus
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Security Options */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember-me"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                                        disabled={isSubmitting}
                                    />
                                    <Label
                                        htmlFor="remember-me"
                                        className="text-sm text-zinc-400 cursor-pointer"
                                    >
                                        Remember me on this device
                                    </Label>
                                </div>

                                {rememberMe && (
                                    <Card className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <CardContent>
                                            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wide">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                Security Notice
                                            </div>
                                            <p className="text-xs text-zinc-400 leading-relaxed">
                                                Your vault secret will be stored in local device storage. Set a passphrase below to encrypt it at rest.
                                            </p>

                                            {/* Expiry selector */}
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500 font-medium">Session expires after</Label>
                                                <Select
                                                    value={expiryOption}
                                                    onValueChange={(value) => setExpiryOption(value as RememberMeExpiry)}
                                                    disabled={isSubmitting}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select expiry" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {EXPIRY_OPTIONS.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Required passphrase */}
                                            <FormField
                                                control={form.control}
                                                name="passphrase"
                                                rules={{ required: rememberMe ? 'Passphrase is required' : false }}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs text-zinc-500 font-medium">
                                                            Passphrase <span className="text-emerald-500">(required to encrypt the stored secret)</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input
                                                                    {...field}
                                                                    type={showPassphrase ? 'text' : 'password'}
                                                                    placeholder="Enter a secure passphrase"
                                                                    disabled={isSubmitting}
                                                                    className="pr-10"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => setShowPassphrase(v => !v)}
                                                                    variant="ghost"
                                                                    size="icon-xs"
                                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                                                    tabIndex={-1}
                                                                    aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
                                                                >
                                                                    {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm text-center font-medium">{error}</p>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting || (rememberMe && !form.getValues('passphrase'))}
                                variant="default"
                                size="lg"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 active:scale-[0.98] shadow-lg"
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                                ) : (
                                    'Finish Setup'
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>

                <p className="text-xs text-zinc-600 text-center uppercase tracking-widest font-bold">
                    Ledgy is 100% Offline & Private
                </p>
            </Card>
        </div>
    );
};
