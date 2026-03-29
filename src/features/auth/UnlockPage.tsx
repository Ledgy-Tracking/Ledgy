import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { OTPInput, SlotProps } from 'input-otp';
import { Lock, ShieldAlert, ArrowRight, AlertTriangle, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore, EXPIRY_OPTIONS, RememberMeExpiry, DEFAULT_EXPIRY } from './useAuthStore';
import { useErrorStore } from '../../stores/useErrorStore';

interface PassphraseFormValues {
    passphrase: string;
}

interface UnlockFormValues {
    rememberMe: boolean;
    passphrase: string;
}

const getFriendlyErrorMessage = (error: unknown): string => {
    if (!error) return 'An unexpected error occurred.';

    const message = error instanceof Error ? error.message : String(error);
    const msg = message.toLowerCase();

    if (msg.includes('decryption failed') || msg.includes('mac check failed') || msg.includes('operation failed')) {
        return 'Incorrect passphrase.';
    }
    if (msg.includes('invalid signature') || msg.includes('verification failed')) {
        return 'Invalid code.';
    }
    return 'An unexpected error occurred. Please try again.';
};

export const UnlockPage: React.FC = () => {
    const [code, setCode] = useState('');
    const dispatchError = useErrorStore(state => state.dispatchError);
    const clearError = useErrorStore(state => state.clearError);
    const currentError = useErrorStore(state => state.error);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // Passphrase (shown when rememberMe is checked)
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);

    // Session expiry (shown when rememberMe is checked)
    const [expiryOption, setExpiryOption] = useState<RememberMeExpiry>(DEFAULT_EXPIRY);

    const { unlock, unlockWithPassphrase, needsPassphrase, reset, isUnlocked } = useAuthStore();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    // Form for passphrase unlock
    const passphraseForm = useForm<PassphraseFormValues>({
        defaultValues: {
            passphrase: '',
        },
    });

    // Form for unlock with remember me options
    const unlockForm = useForm<UnlockFormValues>({
        defaultValues: {
            rememberMe: false,
            passphrase: '',
        },
    });

    // Sync form values with state for handleUnlock
    const rememberMe = unlockForm.watch('rememberMe');

    useEffect(() => {
        if (currentError && code === '') {
            inputRef.current?.focus();
        }
    }, [currentError, code]);

    // If already unlocked (e.g. via ?reset=true bypass), show management UI
    if (isUnlocked) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-full max-w-sm space-y-8 text-center">
                    <Card className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 inline-block">
                        <CardContent>
                            <Lock className="w-8 h-8 text-emerald-500" />
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Vault Unlocked</h1>
                        <p className="text-zinc-400">
                            You are currently authenticated.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={() => navigate('/profiles')}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-900 dark:text-white font-semibold"
                        >
                            <span>Go to Profiles</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>

                        <Button
                            onClick={async () => {
                                await reset();
                                navigate('/setup');
                            }}
                            variant="outline"
                            className="w-full hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 text-zinc-300 font-semibold"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Reset Vault & Logout</span>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const handleUnlock = async (otp: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        clearError();
        try {
            const selectedExpiry = EXPIRY_OPTIONS.find(o => o.value === expiryOption);
            const expiryMs = selectedExpiry?.ms ?? null;
            const formPassphrase = unlockForm.getValues('passphrase');
            const success = await unlock(otp, rememberMe, formPassphrase.length > 0 ? formPassphrase : passphrase, expiryMs);
            if (success) {
                navigate('/profiles');
            } else {
                dispatchError('Invalid code. Please try again.', 'error');
                setCode('');
            }
        } catch (err: unknown) {
            console.error('Unlock error occurred', err);
            dispatchError(getFriendlyErrorMessage(err), 'error');
            setCode('');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const handlePassphraseUnlock = async (data: PassphraseFormValues) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        clearError();
        try {
            const success = await unlockWithPassphrase(data.passphrase);
            if (success) {
                navigate('/profiles');
            } else {
                dispatchError('Incorrect passphrase. Please try again.', 'error');
            }
        } catch (err: unknown) {
            console.error('Passphrase unlock error occurred', err);
            dispatchError(getFriendlyErrorMessage(err), 'error');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const handleUnlockOptions = async (data: UnlockFormValues) => {
        if (isSubmittingRef.current || code.length !== 6) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        clearError();
        try {
            const selectedExpiry = EXPIRY_OPTIONS.find(o => o.value === expiryOption);
            const expiryMs = selectedExpiry?.ms ?? null;
            const success = await unlock(code, data.rememberMe, data.passphrase.length > 0 ? data.passphrase : undefined, expiryMs);
            if (success) {
                navigate('/profiles');
            } else {
                dispatchError('Invalid code. Please try again.', 'error');
                setCode('');
            }
        } catch (err: unknown) {
            console.error('Unlock error occurred', err);
            dispatchError(getFriendlyErrorMessage(err), 'error');
            setCode('');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const onChange = (value: string) => {
        setCode(value);
        if (currentError) clearError();
        if (value.length === 6 && !isSubmittingRef.current) {
            handleUnlock(value);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <Card className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <CardContent>
                            {needsPassphrase ? (
                                <KeyRound className="w-8 h-8 text-emerald-500" />
                            ) : (
                                <Lock className="w-8 h-8 text-emerald-500" />
                            )}
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Ledgy Locked</h1>
                        <p className="text-zinc-400">
                            {needsPassphrase
                                ? 'Enter your passphrase to restore your remembered session.'
                                : 'Enter your 6-digit TOTP code to unlock your vault.'}
                        </p>
                    </div>
                </div>

                {/* ── Passphrase-restore UI (needsPassphrase mode) ── */}
                {needsPassphrase ? (
                    <Form {...passphraseForm}>
                        <form
                            onSubmit={passphraseForm.handleSubmit(handlePassphraseUnlock)}
                            className="flex flex-col w-full space-y-4"
                        >
                            <FormField
                                control={passphraseForm.control}
                                name="passphrase"
                                rules={{ required: 'Passphrase is required' }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showPassphrase ? 'text' : 'password'}
                                                    autoComplete="current-password"
                                                    autoFocus
                                                    placeholder="Enter passphrase…"
                                                    disabled={isSubmitting}
                                                    className="pr-12"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    type="button"
                                                    onClick={() => setShowPassphrase(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                                    tabIndex={-1}
                                                    aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
                                                >
                                                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 dark:text-white font-semibold shadow-lg shadow-emerald-500/10"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Unlock with Passphrase</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                ) : (
                    /* ── Standard TOTP unlock UI ── */
                    <Form {...unlockForm}>
                        <form
                            onSubmit={unlockForm.handleSubmit(handleUnlockOptions)}
                            className="flex flex-col items-center w-full space-y-6"
                        >
                            <OTPInput
                                autoFocus
                                ref={inputRef}
                                maxLength={6}
                                value={code}
                                onChange={onChange}
                                disabled={isSubmitting}
                                autoComplete="one-time-code"
                                containerClassName="group flex items-center has-[:disabled]:opacity-50"
                                render={({ slots }) => (
                                    <div className="flex gap-2">
                                        {slots.map((slot, idx) => (
                                            <Slot key={idx} {...slot} />
                                        ))}
                                    </div>
                                )}
                            />

                            {/* ── Security Warning (Always shown if not passphrase protected) ── */}
                            {!needsPassphrase && !unlockForm.watch('passphrase') && (
                                <div className="w-full bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Action Required</p>
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            For your security, unencrypted vaults are no longer saved. Please check "Remember me" and set a passphrase to keep your vault, or it will be removed when you close the app.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Remember Me section ── */}
                            <div className="w-full space-y-3">
                                <FormField
                                    control={unlockForm.control}
                                    name="rememberMe"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="remember-me-unlock"
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    disabled={isSubmitting}
                                                />
                                                <Label
                                                    htmlFor="remember-me-unlock"
                                                    className="text-sm text-zinc-400 cursor-pointer"
                                                >
                                                    Remember me on this device
                                                </Label>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {unlockForm.watch('rememberMe') && (
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
                                                control={unlockForm.control}
                                                name="passphrase"
                                                rules={{ required: unlockForm.watch('rememberMe') ? 'Passphrase is required' : false }}
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
                                                                    autoComplete="new-password"
                                                                    placeholder="Enter a secure passphrase"
                                                                    disabled={isSubmitting}
                                                                    className="pr-10"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => setShowPassphrase(v => !v)}
                                                                    variant="ghost"
                                                                    size="icon-xs"
                                                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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

                            <Button
                            type="submit"
                            disabled={code.length !== 6 || isSubmitting || (unlockForm.watch('rememberMe') && !unlockForm.watch('passphrase'))}
                            variant="default"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-100 dark:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 dark:text-white shadow-lg shadow-emerald-500/10"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Unlock Vault</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            )}

                <div className="pt-8 text-center space-y-4 flex flex-col items-center">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Secure Local-Only Architecture</p>
                    <Button
                        type="button"
                        onClick={async () => {
                            await reset();
                            navigate('/setup');
                        }}
                        variant="link"
                        className="text-sm text-zinc-500 hover:text-emerald-400"
                    >
                        Not you? Reset vault & start over
                    </Button>
                </div>
            </div >
        </div >
    );
};

const Slot = (props: SlotProps) => {
    return (
        <div
            className={`
                relative w-12 h-16 
                flex items-center justify-center 
                text-2xl font-bold
                border-2 rounded-xl
                transition-all duration-200
                ${props.isActive ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900'}
                ${props.char ? 'text-zinc-50' : 'text-zinc-700'}
            `}
        >
            {props.char !== null && <div>{props.char}</div>}
            {props.hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-caret-blink">
                    <div className="h-8 w-px bg-emerald-500" />
                </div>
            )}
        </div>
    );
};
