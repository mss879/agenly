"use client";
import { useState } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Copy,
  CheckCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  Phone,
} from "lucide-react";

interface WhatsAppSetupWizardProps {
  agentId: string;
  onComplete: () => void;
  onClose: () => void;
}

const STEPS = [
  { title: "Create Meta App", number: 1 },
  { title: "Get Credentials", number: 2 },
  { title: "Configure Webhook", number: 3 },
  { title: "Test Connection", number: 4 },
];

export default function WhatsAppSetupWizard({
  agentId,
  onComplete,
  onClose,
}: WhatsAppSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);

  const platformUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${platformUrl}/webhooks/whatsapp`;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleValidate = async () => {
    setValidating(true);
    setError("");

    try {
      const res = await fetch("/api/whatsapp/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: phoneNumberId.trim(),
          access_token: accessToken.trim(),
        }),
      });
      const data = await res.json();

      if (data.valid) {
        setPhoneDisplay(data.phone_display || "");
        setValidated(true);
        setStep(3);
      } else {
        setError(data.error || "Invalid credentials. Please check and try again.");
      }
    } catch {
      setError("Failed to validate. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleConnect = async () => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/whatsapp/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim(),
          access_token: accessToken.trim(),
          phone_display: phoneDisplay,
        }),
      });
      const data = await res.json();

      if (res.ok && data.channel) {
        setVerifyToken(data.channel.verify_token);
        setStep(4);
      } else {
        setError(data.error || "Failed to save channel.");
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Phone size={18} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Connect WhatsApp</h2>
              <p className="text-xs text-surface-400">
                Step {step} of {STEPS.length}: {STEPS[step - 1].title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <div
                key={s.number}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s.number <= step ? "bg-green-500" : "bg-surface-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* ─── Step 1: Create Meta App ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-surface-300 text-sm leading-relaxed">
                First, you need a Meta (Facebook) Developer account and a WhatsApp app.
                Follow these steps:
              </p>

              <div className="space-y-3">
                {[
                  {
                    num: 1,
                    text: "Go to Meta for Developers and log in",
                    link: "https://developers.facebook.com/",
                  },
                  {
                    num: 2,
                    text: 'Click "Create App" → choose "Business" type',
                  },
                  {
                    num: 3,
                    text: 'On the products page, find "WhatsApp" and click "Set up"',
                  },
                  {
                    num: 4,
                    text: 'Go to WhatsApp → "API Setup" in the left sidebar',
                  },
                ].map((item) => (
                  <div
                    key={item.num}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-semibold text-primary-400 shrink-0 mt-0.5">
                      {item.num}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.text}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-1"
                        >
                          Open Meta Developers <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors text-sm font-medium"
                >
                  I&apos;ve done this <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Get Credentials ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-surface-300 text-sm leading-relaxed">
                In the Meta Dashboard, go to <strong className="text-white">WhatsApp → API Setup</strong>
                {" "}and copy the following values:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">
                    Phone Number ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => { setPhoneNumberId(e.target.value); setValidated(false); setError(""); }}
                    placeholder="e.g. 1060567770467742"
                    className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 transition-all text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">
                    Access Token <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => { setAccessToken(e.target.value); setValidated(false); setError(""); }}
                    placeholder="Paste your access token"
                    className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 transition-all text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1.5">
                    WhatsApp Business Account ID <span className="text-surface-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="e.g. 799317082696720"
                    className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-xl text-white placeholder-surface-500 outline-none focus:border-primary-500 transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-surface-400 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!phoneNumberId.trim() || !accessToken.trim() || validating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {validating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Validating...
                    </>
                  ) : (
                    <>
                      Validate & Continue <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Configure Webhook ─── */}
          {step === 3 && (
            <div className="space-y-4">
              {!verifyToken ? (
                <>
                  <p className="text-surface-300 text-sm leading-relaxed">
                    {validated && phoneDisplay ? (
                      <>
                        ✅ Credentials verified! Phone number:{" "}
                        <strong className="text-green-400">{phoneDisplay}</strong>
                      </>
                    ) : (
                      "Credentials verified!"
                    )}
                  </p>
                  <p className="text-surface-300 text-sm leading-relaxed">
                    Click below to save your connection. You&apos;ll then configure the webhook in Meta.
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-surface-400 hover:text-white transition-colors text-sm"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      onClick={handleConnect}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-500 disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          Save & Get Webhook Config <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-surface-300 text-sm leading-relaxed">
                    ✅ Connection saved! Now configure the webhook in Meta:
                  </p>
                  <p className="text-surface-300 text-sm leading-relaxed">
                    Go to <strong className="text-white">WhatsApp → Configuration → Webhook</strong> and click <strong className="text-white">&quot;Edit&quot;</strong>.
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
                      <label className="block text-xs font-medium text-surface-400 mb-1.5">
                        Callback URL
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm text-green-400 font-mono break-all">
                          {webhookUrl}
                        </code>
                        <button
                          onClick={() => copyText(webhookUrl, "webhook-url")}
                          className="p-2 rounded-lg bg-surface-700 hover:bg-surface-600 transition-colors shrink-0"
                        >
                          {copied === "webhook-url" ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-surface-300" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
                      <label className="block text-xs font-medium text-surface-400 mb-1.5">
                        Verify Token
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm text-green-400 font-mono break-all">
                          {verifyToken}
                        </code>
                        <button
                          onClick={() => copyText(verifyToken, "verify-token")}
                          className="p-2 rounded-lg bg-surface-700 hover:bg-surface-600 transition-colors shrink-0"
                        >
                          {copied === "verify-token" ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-surface-300" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-300">
                      <strong>Important:</strong> After verifying the webhook, make sure to <strong>subscribe to the &quot;messages&quot; field</strong> below the webhook URL.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setStep(4)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors text-sm font-medium"
                    >
                      I&apos;ve configured the webhook <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Step 4: Test Connection ─── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  WhatsApp Connected! 🎉
                </h3>
                <p className="text-surface-400 text-sm max-w-sm mx-auto">
                  Your AI agent is now live on WhatsApp.
                  {phoneDisplay && (
                    <>
                      {" "}Send a message to{" "}
                      <strong className="text-green-400">{phoneDisplay}</strong>{" "}
                      to test it!
                    </>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50 space-y-2">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wide">
                  How it works
                </p>
                <ul className="text-sm text-surface-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    Users send a WhatsApp message to your number
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    Your AI agent processes it with knowledge base context
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    The AI reply is sent back instantly on WhatsApp
                  </li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onComplete}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-colors text-sm font-medium"
                >
                  Done <CheckCircle size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
