/**
 * useWallet Hook
 * 
 * React hook for managing wallet connection state and operations
 */

import { useState, useEffect, useCallback } from "react";
import {
    connectWallet,
    disconnectWallet,
    getAccountAddress,
    getNetwork,
    isWalletConnected,
    isWalletInstalled,
    setNetwork,
    signTransaction,
} from "../services/walletService";
import { STELLAR_CONFIG } from "../config/stellar";

export interface WalletState {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnecting: boolean;
    error: string | null;
    isWalletAvailable: boolean;
    network: string | null;
    isWrongNetwork: boolean;
}

export interface UseWalletReturn extends WalletState {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    refresh: () => Promise<void>;
    signTx: (transaction: any) => Promise<any>;
    switchNetwork: () => Promise<void>;
}

/**
 * Custom hook for wallet management
 */
export function useWallet(): UseWalletReturn {
    const [state, setState] = useState<WalletState>({
        address: null,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: false,
        error: null,
        isWalletAvailable: false,
        network: null,
        isWrongNetwork: false,
    });

    /**
     * Check wallet availability and connection status
     */
    const refresh = useCallback(async () => {
        try {
            const available = await isWalletInstalled();
            const connected = await isWalletConnected();
            const address = connected ? await getAccountAddress() : null;
            const network = connected ? await getNetwork() : null;

            const isWrongNetwork = connected && network !== null &&
                network !== STELLAR_CONFIG.networkPassphrase;

            setState((prev: WalletState) => ({
                ...prev,
                isWalletAvailable: available,
                isConnected: connected,
                address,
                network,
                isWrongNetwork,
                error: null,
            }));
        } catch (error) {
            setState((prev: WalletState) => ({
                ...prev,
                error: error instanceof Error ? error.message : "Unknown error",
            }));
        }
    }, []);

    /**
     * Connect to wallet
     */
    const connect = useCallback(async () => {
        setState((prev: WalletState) => ({
            ...prev,
            isConnecting: true,
            error: null,
        }));

        try {
            const result = await connectWallet();

            if (result.success && result.address) {
                // After connection, refresh to get network status
                await refresh();
            } else {
                setState((prev: WalletState) => ({
                    ...prev,
                    isConnecting: false,
                    error: result.error || "Failed to connect wallet",
                }));
            }
        } catch (error) {
            setState((prev: WalletState) => ({
                ...prev,
                isConnecting: false,
                error: error instanceof Error ? error.message : "Failed to connect wallet",
            }));
        }
    }, [refresh]);

    /**
     * Disconnect wallet
     */
    const disconnect = useCallback(async () => {
        setState((prev: WalletState) => ({
            ...prev,
            isDisconnecting: true,
            error: null,
        }));

        try {
            await disconnectWallet();
            setState((prev: WalletState) => ({
                address: null,
                isConnected: false,
                isConnecting: false,
                isDisconnecting: false,
                error: null,
                isWalletAvailable: prev.isWalletAvailable,
                network: null,
                isWrongNetwork: false,
            }));
        } catch (error) {
            setState((prev: WalletState) => ({
                ...prev,
                isDisconnecting: false,
                error: error instanceof Error ? error.message : "Failed to disconnect wallet",
            }));
        }
    }, [state.isWalletAvailable]);

    /**
     * Switch network to the one required by the app
     */
    const switchNetwork = useCallback(async () => {
        try {
            await setNetwork(STELLAR_CONFIG.networkPassphrase);
            await refresh();
        } catch (error) {
            setState((prev: WalletState) => ({
                ...prev,
                error: error instanceof Error ? error.message : "Failed to switch network",
            }));
        }
    }, [refresh]);

    /**
     * Sign a transaction
     */
    const signTx = useCallback(async (transaction: any) => {
        if (!state.isConnected) {
            throw new Error("Wallet not connected");
        }

        if (state.isWrongNetwork) {
            throw new Error(`Wrong network. Please switch to ${STELLAR_CONFIG.network}`);
        }

        try {
            return await signTransaction(transaction);
        } catch (error) {
            setState((prev: WalletState) => ({
                ...prev,
                error: error instanceof Error ? error.message : "Failed to sign transaction",
            }));
            throw error;
        }
    }, [state.isConnected, state.isWrongNetwork]);

    // Check wallet status on mount and when needed
    useEffect(() => {
        refresh();

        // Setup a listener for account/network changes if the wallet extensions support it
        // Most Stellar wallets don't emit standard events easily solvable here without a poller,
        // but some kits handle it internally. For now we rely on explicit refreshes and mount check.
        const interval = setInterval(refresh, 10000); // Poll every 10s as a fallback
        return () => clearInterval(interval);
    }, [refresh]);

    return {
        ...state,
        connect,
        disconnect,
        refresh,
        signTx,
        switchNetwork,
    };
}
