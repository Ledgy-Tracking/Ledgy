import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { useAuthStore, EXPIRY_OPTIONS, RememberMeExpiry, DEFAULT_EXPIRY } from './useAuthStore';
import { generateSecret, encodeSecret, generateOtpauthUri } from '../../lib/totp';

export const SetupPage: React.FC = () => {
    const [tempSecret, setTempSecret] = useState<string | null>(null);
    const [qrUri, setQrUri] = useState<string>('');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = React.useRef(false);
    const hasGenerated = React.useRef(false);
    const { verifyAndRegister } = useAuthStore();
    const navigate = useNavigate();

    // Security Options
    const [rememberMe, setRememberMe] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [expiryOption, setExpiryOption] = useState<RememberMeExpiry>(DEFAULT_EXPIRY);

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

    const handleVerify = async (val?: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        const verifyCode = val || code;
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
                passphrase.length > 0 ? passphrase : undefined,
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

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
        if (value.length === 6) {
            // Note: We don't auto-submit here anymore because user might want to set passphrase options
            // But if they haven't touched options, maybe we could? 
            // Better to let them click "Finish Setup" to be explicit about options.
            // Actually, for UX, if they type 6 digits, we usually submit.
            // But now we have options below.
            // Let's NOT auto-submit if the code is filled, to allow option setting.
            // Wait, previous UX auto-submitted.
            // If I type code, I might miss the options below.
            // I'll keep auto-submit DISABLED for now, or only if rememberMe is false?
            // Let's remove auto-submit to encourage reviewing security options.
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleVerify();
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl space-y-8">
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
                    <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 text-sm font-mono break-all text-zinc-500 text-center">
                        Secret: <span className="text-zinc-300">{tempSecret}</span>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="code" className="block text-sm font-medium text-zinc-400 text-center">
                                Enter 6-digit confirmation code
                            </label>
                            <input
                                id="code"
                                type="text"
                                maxLength={6}
                                value={code}
                                onChange={handleCodeChange}
                                placeholder="000000"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-4 text-center text-3xl tracking-widest text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                                autoFocus
                            />
                        </div>

                        {/* Security Options */}
                        <div className="space-y-3 pt-2">
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

                        {error && (
                            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={code.length !== 6 || isSubmitting}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98]"
                        >
                            {isSubmitting ? 'Verifying...' : 'Finish Setup'}
                        </button>
                    </form>
                </div>

                <p className="text-xs text-zinc-600 text-center uppercase tracking-widest font-bold">
                    Ledgy is 100% Offline & Private
                </p>
            </div>
        </div>
    );
};
