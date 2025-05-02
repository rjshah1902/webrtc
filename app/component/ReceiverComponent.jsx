"use client";
import { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';
import axios from 'axios';

const ReceiverComponent = ({ userId }) => {
    const localVideo = useRef();
    const remoteVideo = useRef();
    const [peer, setPeer] = useState(null);
    const [stream, setStream] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callStatus, setCallStatus] = useState('idle');

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

    // Set up Pusher to listen for incoming calls
    useEffect(() => {
        const pusher = new Pusher('269d13558029dd7964d8', {
            cluster: 'ap2',
        });

        const channel = pusher.subscribe(`video-call-channel`);

        // Listen for incoming call events
        channel.bind('App\\Events\\IncomingCall', data => {
            // Check if the call is for this user
            if (data.receiverId == userId) {
                console.log("Incoming call from:", data.callerId);
                setIncomingCall({
                    callerId: data.callerId,
                    callId: data.callId,
                    signalData: data.signalData
                });
                setCallStatus('incoming');
            }
        });

        // Listen for call ended events
        channel.bind('App\\Events\\CallEnded', data => {
            if (incomingCall && data.callId === incomingCall.callId) {
                console.log("Call ended by caller");
                if (peer) {
                    peer.destroy();
                }
                setCallStatus('ended');
            }
        });

        return () => {
            pusher.unsubscribe(`video-call-channel`);
        };
    }, [userId, incomingCall, peer]);

    const answerCall = () => {
        if (!stream || !incomingCall) {
            console.error("Media stream or incoming call not available");
            return;
        }

        // Create a peer connection as the non-initiator
        const p = new Peer({
            initiator: false,
            trickle: false,
            stream: stream
        });

        p.on('signal', async answerSignal => {
            console.log("Receiver sending answer signal:", answerSignal);

            try {
                // Send the answer signal to the server
                await axios.post('http://127.0.0.1:8000/api/answer-call', {
                    callId: incomingCall.callId,
                    callerId: incomingCall.callerId,
                    receiverId: userId,
                    signalData: answerSignal
                });
            } catch (error) {
                console.error("Error answering call:", error);
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

        // Accept the offer signal
        p.signal(incomingCall.signalData);
        setPeer(p);
    };

    const rejectCall = () => {
        if (incomingCall) {
            // Notify the server that the call was rejected
            axios.post('http://127.0.0.1:8000/api/reject-call', {
                callId: incomingCall.callId,
                callerId: incomingCall.callerId,
                receiverId: userId
            }).catch(error => {
                console.error("Error rejecting call:", error);
            });
        }

        setIncomingCall(null);
        setCallStatus('idle');
    };

    const endCall = () => {
        if (peer) {
            peer.destroy();
        }

        if (incomingCall) {
            // Notify the server that the call has ended
            axios.post('http://127.0.0.1:8000/api/end-call', {
                callId: incomingCall.callId
            }).catch(error => {
                console.error("Error ending call:", error);
            });
        }

        setCallStatus('ended');
    };

    return (
        <div className="flex flex-col items-center p-4">
            <h2 className="text-xl font-bold mb-4">Receiver: User {userId}</h2>

            <div className="mb-4">
                {callStatus === 'incoming' && (
                    <div className="flex items-center space-x-2">
                        <p className="text-yellow-500">Incoming call from User {incomingCall?.callerId}...</p>
                        <button
                            onClick={answerCall}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                            disabled={!stream}
                        >
                            Answer
                        </button>
                        <button
                            onClick={rejectCall}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                        >
                            Reject
                        </button>
                    </div>
                )}

                {callStatus === 'connected' && (
                    <div className="flex items-center space-x-2">
                        <p className="text-green-500">Connected with User {incomingCall?.callerId}</p>
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
                            Ready for New Calls
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
                            Reset
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
                    <h3 className="text-center mb-2">Caller Video</h3>
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

export default ReceiverComponent;