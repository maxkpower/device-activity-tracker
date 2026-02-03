import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectionState } from '../App';
import { CheckCircle } from 'lucide-react';

interface LoginProps {
    connectionState: ConnectionState;
}

export function Login({ connectionState }: LoginProps) {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WhatsApp Connection */}
            <div className="flex flex-col items-center justify-center bg-dark-900 p-8 rounded-xl /20 border border-gray-300/30 relative overflow-hidden ">
                <div className="" />
                <div className="flex items-center gap-2 mb-6 relative">
                    <h2 className="text-2xl font-semibold text-gray-100">Connect WhatsApp</h2>
                    {connectionState.whatsapp && (
                        <CheckCircle className="text-accent-green " size={24} />
                    )}
                </div>
                {connectionState.whatsapp ? (
                    <div className="w-64 h-64 flex flex-col items-center justify-center text-accent-green bg-accent-green/10 rounded-lg border-2 border-accent-green/40  relative">
                        <CheckCircle size={64} className="mb-4 " />
                        <span className="text-lg font-semiboldr">Connected!</span>
                    </div>
                ) : (
                    <>
                        <div className="bg-dark-950 p-4 rounded-lg mb-6 border border-gray-300/30  relative">
                            {connectionState.whatsappQr ? (
                                <QRCodeSVG value={connectionState.whatsappQr} size={256} />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center text-gray-300/50 text-sm animate-pulse">
                                    Waiting for QR Code...
                                </div>
                            )}
                        </div>
                        <p className="text-gray-300/70 text-sm text-center max-w-md relative">
                            Open WhatsApp on your phone, go to Settings {'>'} Linked Devices, and scan the QR code to connect.
                        </p>
                    </>
                )}
            </div>

            {/* Signal Connection */}
            <div className="flex flex-col items-center justify-center bg-dark-900 p-8 rounded-xl /20 border border-gray-300/30 relative overflow-hidden ">
                <div className="" />
                <div className="flex items-center gap-2 mb-6 relative">
                    <h2 className="text-2xl font-semibold text-gray-100">Connect Signal</h2>
                    {connectionState.signal && (
                        <CheckCircle className="text-gray-300 " size={24} />
                    )}
                </div>
                {connectionState.signal ? (
                    <div className="w-64 h-64 flex flex-col items-center justify-center text-gray-300 bg-gray-300/10 rounded-lg border-2 border-gray-300/40  relative">
                        <CheckCircle size={64} className="mb-4 " />
                        <span className="text-lg font-semiboldr">Connected!</span>
                        <span className="text-sm text-gray-300/80 mt-2">{connectionState.signalNumber}</span>
                    </div>
                ) : connectionState.signalApiAvailable ? (
                    <>
                        <div className="bg-dark-950 p-4 rounded-lg mb-6 border border-gray-300/30  relative">
                            {connectionState.signalQrImage ? (
                                <img
                                    src={connectionState.signalQrImage}
                                    alt="Signal QR Code"
                                    width={256}
                                    height={256}
                                    className="bg-white rounded"
                                />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center text-gray-300/50 text-sm animate-pulse">
                                    Waiting for QR Code...
                                </div>
                            )}
                        </div>
                        <p className="text-gray-300/70 text-sm text-center max-w-md relative">
                            Open Signal on your phone, go to Settings {'>'} Linked Devices, and scan the QR code to connect.
                        </p>
                    </>
                ) : (
                    <div className="w-64 h-64 flex flex-col items-center justify-center text-accent-red/60 bg-dark-950/50 rounded-lg border border-accent-red/20">
                        <p className="text-center px-4 uppercase">Signal API Not Available</p>
                        <p className="text-xs text-center px-4 mt-2 text-gray-300/50">Run the signal-cli-rest-api Docker container to enable</p>
                    </div>
                )}
            </div>
        </div>
    );
}
