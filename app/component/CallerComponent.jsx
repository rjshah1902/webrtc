"use client";
import { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';
import axios from 'axios';
import baseUrl from '../base-url/baseUrl';

const CallerComponent = ({ userId, receiverId }) => {
    const localVideo = useRef();
    const remoteVideo = useRef();
    const [peer, setPeer] = useState(null);
    const [stream, setStream] = useState(null);
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected, ended
    const [callId, setCallId] = useState(null);

    // Initialize media devices on component mount
    useEffect(() => {
        const setupMedia = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                setStream(mediaStream);

                if (localVideo.current) {
                    localVideo.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing media devices:", err);
                setCallStatus('error');
            }
        };

        setupMedia();

        return () => {
            // Cleanup function
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Initialize Pusher for receiving answer signals
    useEffect(() => {
        if (callStatus !== 'idle' && callStatus !== 'error') {
            const pusher = new Pusher('269d13558029dd7964d8', {
                cluster: 'ap2',
            });

            const channel = pusher.subscribe(`video-call-channel`);

            channel.bind('App\\Events\\VideoCallSignal', data => {
                // Only process signals meant for this call and this user
                if (data.callId === callId && data.receiverId == userId) {
                    console.log("Caller received signal:", data.signalData);

                    // Process the signal if we have an active peer connection
                    if (peer) {
                        peer.signal(data.signalData);
                    }
                }
            });

            return () => {
                pusher.unsubscribe(`video-call-channel`);
            };
        }
    }, [callStatus, callId, peer, userId]);

    const startCall = async () => {
        if (!stream) {
            console.error("Media stream not available");
            return;
        }

        setCallStatus('calling');

        // Generate a unique call ID
        const newCallId = Date.now().toString();
        setCallId(newCallId);

        // Create a peer connection as the initiator
        const p = new Peer({
            initiator: true,
            trickle: false,
            stream: stream
        });

        p.on('signal', async data => {
            console.log("Caller sending signal:", data);

            try {
                // Send the offer signal to the server
                const response = await axios.post('https://970b-2405-201-3019-70a6-21c3-55a5-9770-f771.ngrok-free.app/api/create-call', {
                    callerId: userId,
                    receiverId: receiverId,
                    callId: newCallId,
                    signalData: data
                });

                console.log("Call created:", response.data);
            } catch (error) {
                console.error("Error creating call:", error);
                setCallStatus('error');
            }
        });

        p.on('connect', () => {
            console.log("Peer connection established");
            setCallStatus('connected');
        });

        p.on('stream', remoteStream => {
            console.log("Received remote stream");
            if (remoteVideo.current) {
                remoteVideo.current.srcObject = remoteStream;
            }
        });

        p.on('error', err => {
            console.error("Peer connection error:", err);
            setCallStatus('error');
        });

        p.on('close', () => {
            console.log("Peer connection closed");
            setCallStatus('ended');
        });

        setPeer(p);
    };

    const endCall = () => {
        if (peer) {
            peer.destroy();
        }

        // Notify the server that the call has ended
        axios.post('https://970b-2405-201-3019-70a6-21c3-55a5-9770-f771.ngrok-free.app/api/end-call', {
            callId: callId
        }).catch(error => {
            console.error("Error ending call:", error);
        });

        setCallStatus('ended');
    };

    return (
        <div className="flex flex-col items-center p-4">
            <h2 className="text-xl font-bold mb-4">Video Call</h2>

            <div className="mb-4">
                {callStatus === 'idle' && (
                    <button
                        onClick={startCall}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        disabled={!stream}
                    >
                        Call User {receiverId}
                    </button>
                )}

                {callStatus === 'calling' && (
                    <div className="flex items-center space-x-2">
                        <p className="text-yellow-500">Calling User {receiverId}...</p>
                        <button
                            onClick={endCall}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {callStatus === 'connected' && (
                    <div className="flex items-center space-x-2">
                        <p className="text-green-500">Connected with User {receiverId}</p>
                        <button
                            onClick={endCall}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                            End Call
                        </button>
                    </div>
                )}

                {callStatus === 'ended' && (
                    <div className="flex items-center space-x-2">
                        <p className="text-gray-500">Call ended</p>
                        <button
                            onClick={() => setCallStatus('idle')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            New Call
                        </button>
                    </div>
                )}

                {callStatus === 'error' && (
                    <div className="flex items-center space-x-2">
                        <p className="text-red-500">Call error occurred</p>
                        <button
                            onClick={() => setCallStatus('idle')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <div className="border rounded p-2">
                    <h3 className="text-center mb-2">Your Video</h3>
                    <video
                        ref={localVideo}
                        muted
                        playsInline
                        autoPlay
                        className="w-72 h-48 bg-gray-200"
                    />
                </div>

                <div className="border rounded p-2">
                    <h3 className="text-center mb-2">Remote Video</h3>
                    <video
                        ref={remoteVideo}
                        playsInline
                        autoPlay
                        className="w-72 h-48 bg-gray-200"
                    />
                </div>
            </div>
        </div>
    );
};

export default CallerComponent;