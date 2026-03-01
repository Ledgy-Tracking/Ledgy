import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from './useAuthStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { QRCodeDisplay } from './QRCodeDisplay';
import { generateSecret, encodeSecret, generateTOTPURI, generateBackupCodes, getSecondsUntilNextCode } from '../../lib/totp';
import { Shield, CheckCircle, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';

type WizardStep = 'generate' | 'verify' | 'success';

export const TOTPRegistrationWizard = () => {
    const [step, setStep] = useState<WizardStep>('generate');
    const [secret, setSecret] = useState<string>('');
    const [totpUri, setTotpUri] = useState<string>('');
    const [totpCode, setTotpCode] = useState<string>('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilNextCode());
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    const { verifyAndRegister, initSession } = useAuthStore();
    const { dispatchError } = useErrorStore();

    // Countdown timer for TOTP code expiry
    useEffect(() => {
        if (step !== 'verify') return;

        const updateTimer = () => {
            const seconds = getSecondsUntilNextCode();
            setSecondsLeft(seconds);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [step]);

    // Generate secret on mount
    useEffect(() => {
        try {
            const rawSecret = generateSecret();
            const base32 = encodeSecret(rawSecret);
            // Use generic account name - will be replaced with actual user email in Story 2.x
            const uri = generateTOTPURI(base32, 'user@ledgy.app', 'Ledgy');
            setSecret(base32);
            setTotpUri(uri);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate TOTP secret';
            dispatchError(errorMessage, 'error');
        }
    }, [dispatchError]);

    // Regenerate secret
    const handleRegenerate = useCallback(() => {
        try {
            const rawSecret = generateSecret();
            const base32 = encodeSecret(rawSecret);
            const uri = generateTOTPURI(base32, 'user@ledgy.app', 'Ledgy');
            setSecret(base32);
            setTotpUri(uri);
            setTotpCode('');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate TOTP secret';
            dispatchError(errorMessage, 'error');
        }
    }, [dispatchError]);

    // Verify TOTP code
    const handleVerify = useCallback(async () => {
        if (!secret || totpCode.length !== 6) {
            dispatchError('Please enter a valid 6-digit code', 'error');
            return;
        }

        setIsVerifying(true);
        try {
            // Use verifyAndRegister to verify and store the secret
            const success = await verifyAndRegister(secret, totpCode, true);
            
            if (success) {
                // Initialize session to persist state
                await initSession();
                
                // Generate backup codes
                const codes = generateBackupCodes(10);
                setBackupCodes(codes);
                
                setStep('success');
            } else {
                dispatchError('Invalid TOTP code. Please try again.', 'error');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Verification failed';
            dispatchError(errorMessage, 'error');
        } finally {
            setIsVerifying(false);
        }
    }, [secret, totpCode, verifyAndRegister, initSession, dispatchError]);

    // Auto-verify when code is entered (debounced)
    useEffect(() => {
        if (totpCode.length === 6 && !isVerifying) {
            const timer = setTimeout(() => {
                handleVerify();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [totpCode, handleVerify, isVerifying]);

    // Copy backup codes
    const handleCopyBackupCodes = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(backupCodes.join('\n'));
        } catch (error) {
            console.error('Failed to copy backup codes:', error);
        }
    }, [backupCodes]);

    // Memoize progress indicator
    const progressIndicator = useMemo(() => (
        <div className="flex items-center justify-center gap-4 mb-8">
            {(['generate', 'verify', 'success'] as WizardStep[]).map((s, index) => (
                <div key={s} className="flex items-center">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                            step === s
                                ? 'bg-blue-600 text-white'
                                : index < ['generate', 'verify', 'success'].indexOf(step)
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                        {index < ['generate', 'verify', 'success'].indexOf(step) ? (
                            <CheckCircle className="w-6 h-6" />
                        ) : (
                            index + 1
                        )}
                    </div>
                    {index < 2 && (
                        <div
                            className={`w-16 h-1 mx-2 rounded transition-colors ${
                                index < ['generate', 'verify', 'success'].indexOf(step)
                                    ? 'bg-green-600'
                                    : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                        />
                    )}
                </div>
            ))}
        </div>
    ), [step]);

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Set Up Two-Factor Authentication
                    </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    Protect your account with an authenticator app
                </p>
                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                    <HelpCircle className="w-4 h-4" />
                    What is two-factor authentication?
                </button>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                        What is Two-Factor Authentication?
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                        Two-factor authentication (2FA) adds an extra layer of security to your account.
                        After entering your password, you'll need to enter a code from your authenticator app.
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                        Popular authenticator apps include: Google Authenticator, Authy, Microsoft Authenticator, and 1Password.
                    </p>
                </div>
            )}

            {/* Progress Indicator */}
            {progressIndicator}

            {/* Step Content */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                {/* Step 1: Generate */}
                {step === 'generate' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                            Scan QR Code with Your Authenticator App
                        </h2>
                        <QRCodeDisplay
                            totpUri={totpUri}
                            secret={secret}
                            accountName="user@ledgy.app"
                        />
                        <div className="flex justify-center">
                            <button
                                onClick={() => setStep('verify')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Continue to Verification
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Verify */}
                {step === 'verify' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                            Enter Verification Code
                        </h2>
                        
                        {/* Countdown Timer */}
                        <div className="flex items-center justify-center gap-2">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Next code in:
                            </div>
                            <div
                                className={`px-3 py-1 rounded font-mono font-semibold ${
                                    secondsLeft <= 5
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {secondsLeft}s
                            </div>
                        </div>

                        {/* Code Input */}
                        <div className="flex justify-center">
                            <input
                                type="text"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="w-48 px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                aria-label="6-digit TOTP code from authenticator app"
                            />
                        </div>

                        {/* Status */}
                        {isVerifying && (
                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                Verifying...
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={handleRegenerate}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Rescan QR Code
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Two-Factor Authentication Enabled!
                            </h2>
                        </div>

                        {/* Backup Codes */}
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div className="flex items-start gap-3 mb-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                                        Save Your Backup Codes
                                    </h3>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                        These codes can be used to access your account if you lose your authenticator device.
                                        Store them in a safe place!
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {backupCodes.map((code, index) => (
                                    <code
                                        key={index}
                                        className="px-3 py-2 bg-white dark:bg-gray-900 rounded font-mono text-sm text-center border border-gray-200 dark:border-gray-700"
                                    >
                                        {code}
                                    </code>
                                ))}
                            </div>

                            <button
                                onClick={handleCopyBackupCodes}
                                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Copy Backup Codes
                            </button>
                        </div>

                        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                            You can now use your authenticator app to log in securely.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
