import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OTPInput, SlotProps } from 'input-otp';
import { Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuthStore } from './useAuthStore';

export const UnlockPage: React.FC = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { unlock } = useAuthStore();
    const totpSecret = useAuthStore(state => state.totpSecret);
    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!totpSecret) {
            navigate('/setup', { replace: true });
            return;
        }
        if (isUnlocked) {
            navigate('/profiles', { replace: true });
            return;
        }
    }, [totpSecret, isUnlocked, navigate]);

    const handleUnlock = async (otp: string) => {
        setIsSubmitting(true);
        setError(false);
        try {
            const success = await unlock(otp);
            if (success) {
                navigate('/profiles');
            } else {
                setError(true);
                setCode('');
                setTimeout(() => inputRef.current?.focus(), 10);
            }
        } catch (err) {
            console.error('Unlock error:', err);
            setError(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onChange = (value: string) => {
        setCode(value);
        if (error) setError(false);
        if (value.length === 6 && !isSubmitting) {
            handleUnlock(value);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <Lock className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Ledgy Locked</h1>
                        <p className="text-zinc-400">Enter your 6-digit TOTP code to unlock your vault.</p>
                    </div>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (code.length === 6 && !isSubmitting) {
                            handleUnlock(code);
                        }
                    }}
                    className="flex flex-col items-center w-full space-y-6"
                >
                    <OTPInput
                        ref={inputRef}
                        maxLength={6}
                        value={code}
                        onChange={onChange}
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
                            <span className="text-sm font-medium">Invalid code. Please try again.</span>
                        </div>
                    )}

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
                </form>

                <div className="pt-8 text-center">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Secure Local-Only Architecture</p>
                </div>
            </div>
        </div>
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
