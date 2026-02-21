import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OTPInput, SlotProps } from 'input-otp';
import { Lock, ShieldAlert, ArrowRight, AlertTriangle, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react';
import { useAuthStore, EXPIRY_OPTIONS, RememberMeExpiry, DEFAULT_EXPIRY } from './useAuthStore';

const getFriendlyErrorMessage = (error: any): string => {
    if (!error) return 'An unexpected error occurred.';
    const msg = (error?.message || String(error)).toLowerCase();

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
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Passphrase (shown when rememberMe is checked)
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);

    // Session expiry (shown when rememberMe is checked)
    const [expiryOption, setExpiryOption] = useState<RememberMeExpiry>(DEFAULT_EXPIRY);

    const { unlock, unlockWithPassphrase, needsPassphrase, reset, isUnlocked } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);

    const isResetMode = searchParams.get('reset') === 'true';

    useEffect(() => {
        if (error && code === '') {
            inputRef.current?.focus();
        }
    }, [error, code]);

    // If already unlocked (e.g. via ?reset=true bypass), show management UI
    if (isUnlocked) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-full max-w-sm space-y-8 text-center">
                    <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 inline-block">
                        <Lock className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Vault Unlocked</h1>
                        <p className="text-zinc-400">
                            You are currently authenticated.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/profiles')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all"
                        >
                            <span>Go to Profiles</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => {
                                reset();
                                navigate('/setup');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 border border-zinc-700 text-zinc-300 font-semibold rounded-lg transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Reset Vault & Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleUnlock = async (otp: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setError(null);
        try {
            const selectedExpiry = EXPIRY_OPTIONS.find(o => o.value === expiryOption);
            const expiryMs = selectedExpiry?.ms ?? null;
            const success = await unlock(otp, rememberMe, passphrase.length > 0 ? passphrase : undefined, expiryMs);
            if (success) {
                navigate('/profiles');
            } else {
                setError('Invalid code. Please try again.');
                setCode('');
            }
        } catch (err: any) {
            console.error('Unlock error occurred', err);
            setError(getFriendlyErrorMessage(err));
            setCode('');
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const handlePassphraseUnlock = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setError(null);
        try {
            const success = await unlockWithPassphrase(passphrase);
            if (success) {
                navigate('/profiles');
            } else {
                setError('Incorrect passphrase. Please try again.');
            }
        } catch (err: any) {
            console.error('Passphrase unlock error occurred', err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setIsSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const onChange = (value: string) => {
        setCode(value);
        if (error) setError(null);
        if (value.length === 6 && !isSubmittingRef.current) {
            handleUnlock(value);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        {needsPassphrase ? (
                            <KeyRound className="w-8 h-8 text-emerald-500" />
                        ) : (
                            <Lock className="w-8 h-8 text-emerald-500" />
                        )}
                    </div>
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
                    <form
                        onSubmit={(e) => { e.preventDefault(); handlePassphraseUnlock(); }}
                        className="flex flex-col w-full space-y-4"
                    >
                        <div className="relative">
                            <input
                                type={showPassphrase ? 'text' : 'password'}
                                autoFocus
                                value={passphrase}
                                onChange={(e) => { setPassphrase(e.target.value); if (error) setError(null); }}
                                placeholder="Enter passphrase…"
                                disabled={isSubmitting}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassphrase(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                tabIndex={-1}
                            >
                                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                <ShieldAlert className="w-4 h-4" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!passphrase || isSubmitting}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/10"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Unlock with Passphrase</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    /* ── Standard TOTP unlock UI ── */
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (code.length === 6 && !isSubmittingRef.current) {
                                handleUnlock(code);
                            }
                        }}
                        className="flex flex-col items-center w-full space-y-6"
                    >
                        <OTPInput
                            autoFocus
                            ref={inputRef}
                            maxLength={6}
                            value={code}
                            onChange={onChange}
                            disabled={isSubmitting}
                            containerClassName="group flex items-center has-[:disabled]:opacity-50"
                            render={({ slots }) => (
                                <div className="flex gap-2">
                                    {slots.map((slot, idx) => (
                                        <Slot key={idx} {...slot} />
                                    ))}
                                </div>
                            )}
                        />

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                                <ShieldAlert className="w-4 h-4" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {/* ── Security Warning (Always shown if not passphrase protected) ── */}
                        {!needsPassphrase && !passphrase && (
                            <div className="w-full bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Vault Unsecured</p>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Your secret is stored on this device. Set a passphrase below to encrypt it at rest.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── Remember Me section ── */}
                        <div className="w-full space-y-3">
                            <label className="flex items-center gap-2 self-start text-sm text-zinc-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={isSubmitting}
                                />
                                Remember me on this device
                            </label>

                            {rememberMe && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wide">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        Security Notice
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Your vault secret will be stored in local device storage. Set a passphrase below to encrypt it at rest.
                                    </p>

                                    {/* Expiry selector */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-500 font-medium">Session expires after</label>
                                        <select
                                            value={expiryOption}
                                            onChange={(e) => setExpiryOption(e.target.value as RememberMeExpiry)}
                                            disabled={isSubmitting}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50"
                                        >
                                            {EXPIRY_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Optional passphrase */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-zinc-500 font-medium">
                                            Passphrase <span className="text-zinc-600">(optional — encrypts the stored secret)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassphrase ? 'text' : 'password'}
                                                value={passphrase}
                                                onChange={(e) => setPassphrase(e.target.value)}
                                                placeholder="Leave blank for plain storage"
                                                disabled={isSubmitting}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassphrase(v => !v)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                                tabIndex={-1}
                                            >
                                                {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={code.length !== 6 || isSubmitting}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/10"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Unlock Vault</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form >
                )}

                <div className="pt-8 text-center space-y-4 flex flex-col items-center">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Secure Local-Only Architecture</p>
                    <button
                        type="button"
                        onClick={() => {
                            reset();
                            navigate('/setup');
                        }}
                        className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer"
                    >
                        Not you? Reset vault & start over
                    </button>
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
                ${props.isActive ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-zinc-800 bg-zinc-900'}
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
