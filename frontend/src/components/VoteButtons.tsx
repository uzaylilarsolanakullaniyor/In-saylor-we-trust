// ============================================================
// FEATURE 2 — Voting. Bullish/Bearish buttons that send an on-chain tx.
// First time -> vote(); if already voted -> changeVote(). Gas only.
// ============================================================

import { useEffect, useRef } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { encodeFunctionData, concatHex } from "viem";
import { CONTRACT_ADDRESS, SENTIMENT_ABI, Sentiment, BUILDER_CODE_SUFFIX, ACTIVE_CHAIN } from "../lib/contract";

export function VoteButtons({
  companyId,
  onVoted,
}: {
  companyId: number;
  onVoted: () => void; // parent refetches the sentiment bar after success
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== ACTIVE_CHAIN.id;

  // What has THIS wallet already voted? Drives vote vs changeVote + highlight.
  // chainId pins the read to Base mainnet so it works even if the wallet is
  // currently on another network.
  const { data: current, refetch: refetchUserVote } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SENTIMENT_ABI,
    functionName: "getUserVote",
    args: address ? [companyId, address] : undefined,
    chainId: ACTIVE_CHAIN.id,
    query: { enabled: Boolean(address) },
  });

  // How long until they can change their vote (cooldown countdown).
  const { data: cooldown } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SENTIMENT_ABI,
    functionName: "changeCooldownRemaining",
    args: address ? [companyId, address] : undefined,
    chainId: ACTIVE_CHAIN.id,
    query: { enabled: Boolean(address), refetchInterval: 10_000 },
  });

  // We send a raw transaction (not writeContract) so we can append the Base
  // builder-code suffix to the calldata for on-chain attribution.
  const { sendTransaction, data: txHash, isPending, error } = useSendTransaction();

  // Wait for the tx to be mined, then refresh the UI.
  const { isLoading: isMining, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: ACTIVE_CHAIN.id,
    query: { enabled: Boolean(txHash) },
  });

  const currentVote = (current ?? Sentiment.None) as Sentiment;
  const hasVoted = currentVote !== Sentiment.None;
  const cooldownSecs = cooldown ? Number(cooldown) : 0;

  // After a tx is confirmed, refresh the user's vote + the parent tallies —
  // exactly ONCE per transaction. The ref guard prevents an infinite loop
  // (onVoted() re-renders the parent, which must not re-trigger this).
  const handledTx = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isConfirmed && txHash && handledTx.current !== txHash) {
      handledTx.current = txHash;
      refetchUserVote();
      onVoted();
    }
  }, [isConfirmed, txHash, refetchUserVote, onVoted]);

  function cast(choice: Sentiment) {
    if (!isConnected || currentVote === choice) return;

    // First-timers call vote(); repeat voters call changeVote().
    const functionName = hasVoted ? "changeVote" : "vote";

    // Build the function calldata, then append the builder-code suffix.
    // The contract ignores the trailing bytes; Base attributes the activity.
    const calldata = encodeFunctionData({
      abi: SENTIMENT_ABI,
      functionName,
      args: [companyId, choice],
    });

    sendTransaction({
      to: CONTRACT_ADDRESS,
      data: concatHex([calldata, BUILDER_CODE_SUFFIX]),
      chainId: ACTIVE_CHAIN.id, // force Base mainnet (prompts a switch if needed)
    });
  }

  // Disable "change" while cooldown is active (the contract enforces it too,
  // but disabling avoids a guaranteed-to-revert tx and wasted gas).
  const changeBlocked = hasVoted && cooldownSecs > 0;
  const busy = isPending || isMining;

  if (!isConnected) {
    return <p className="vhint">Connect a wallet to vote.</p>;
  }

  // Wrong network: reads still work (pinned to mainnet), but voting needs the
  // wallet on Base. Offer a one-click switch instead of a confusing tx error.
  if (wrongNetwork) {
    return (
      <button className="vbtn switch" onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}>
        ⚠️ Switch to {ACTIVE_CHAIN.name} to vote
      </button>
    );
  }

  return (
    <div className="vote">
      <button
        className={`vbtn bull ${currentVote === Sentiment.Bullish ? "on" : ""}`}
        disabled={busy || changeBlocked || currentVote === Sentiment.Bullish}
        onClick={() => cast(Sentiment.Bullish)}
      >
        🐂 Bullish
      </button>

      <button
        className={`vbtn bear ${currentVote === Sentiment.Bearish ? "on" : ""}`}
        disabled={busy || changeBlocked || currentVote === Sentiment.Bearish}
        onClick={() => cast(Sentiment.Bearish)}
      >
        🐻 Bearish
      </button>

      <div className="vstatus">
        {busy && <span>⏳ Confirming on-chain…</span>}
        {!busy && !hasVoted && <span>Bull or bear? Cast your vote 👇</span>}
        {!busy && hasVoted && (
          <span>
            Your vote: <strong>{currentVote === Sentiment.Bullish ? "Bullish" : "Bearish"}</strong>
            {changeBlocked
              ? ` · you can change it in ${Math.ceil(cooldownSecs / 60)} min`
              : " · you can change it now"}
          </span>
        )}
        {error && <span className="err"> ⚠️ {error.message.split("\n")[0]}</span>}
      </div>
    </div>
  );
}
