// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SentimentVoting
 * @notice On-chain bullish/bearish voting for crypto treasury companies.
 *         Users pay ONLY gas (no app fee). One vote per wallet per company.
 *         Votes can be changed after a cooldown period.
 *
 * @dev Design goals:
 *      - Gas-efficient: only mappings + counters, no arrays, no loops.
 *      - The contract stores NOTHING about prices/P&L. That all lives
 *        off-chain (CoinGecko) and is computed in the frontend.
 *      - Sybil mitigation here is COOLDOWN-ONLY (simplest). See notes
 *        in the docs for stronger options (stake / proof-of-personhood).
 */
contract SentimentVoting {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// @notice A wallet's sentiment for one company.
    /// @dev `None` (=0) is the default for any address that has never voted,
    ///      so we can tell "hasn't voted" apart from a real Bullish/Bearish.
    enum Sentiment {
        None,    // 0 - default, means "no vote yet"
        Bullish, // 1
        Bearish  // 2
    }

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    /// @notice How many companies we track (MSTR=0, BMNR=1, FWDI=2).
    /// @dev companyId must be < COMPANY_COUNT. Hardcoded because the set is fixed.
    uint8 public constant COMPANY_COUNT = 3;

    /// @notice Minimum time a wallet must wait before changing its vote.
    /// @dev Cooldown raises the cost of vote-flipping spam. 1 hour is a sane
    ///      default; adjust before deploy if you want stricter/looser behavior.
    uint256 public constant CHANGE_COOLDOWN = 1 hours;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @notice The current sentiment of each wallet, per company.
    /// userVote[companyId][wallet] => Sentiment
    mapping(uint8 => mapping(address => Sentiment)) public userVote;

    /// @notice Timestamp of a wallet's last vote action, per company.
    /// Used to enforce CHANGE_COOLDOWN. lastVoteAt[companyId][wallet] => unix time
    mapping(uint8 => mapping(address => uint256)) public lastVoteAt;

    /// @notice Running tally of bullish votes per company.
    mapping(uint8 => uint256) public bullishCount;

    /// @notice Running tally of bearish votes per company.
    mapping(uint8 => uint256) public bearishCount;

    // ---------------------------------------------------------------------
    // Events  (frontends listen to these for instant UI updates)
    // ---------------------------------------------------------------------

    /// @notice Emitted the first time a wallet votes on a company.
    event Voted(address indexed voter, uint8 indexed companyId, Sentiment sentiment);

    /// @notice Emitted when a wallet flips an existing vote.
    event VoteChanged(
        address indexed voter,
        uint8 indexed companyId,
        Sentiment oldSentiment,
        Sentiment newSentiment
    );

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Rejects any companyId outside the known set (0..COMPANY_COUNT-1).
    modifier validCompany(uint8 companyId) {
        require(companyId < COMPANY_COUNT, "Invalid company");
        _;
    }

    /// @dev Rejects the meaningless `None` sentiment for write functions.
    ///      Callers must pick Bullish or Bearish.
    modifier validSentiment(Sentiment sentiment) {
        require(
            sentiment == Sentiment.Bullish || sentiment == Sentiment.Bearish,
            "Must be Bullish or Bearish"
        );
        _;
    }

    // ---------------------------------------------------------------------
    // Write functions
    // ---------------------------------------------------------------------

    /**
     * @notice Cast your FIRST vote for a company.
     * @param companyId  0 = Strategy/MSTR, 1 = BitMine/BMNR, 2 = Forward/FWDI
     * @param sentiment  Sentiment.Bullish (1) or Sentiment.Bearish (2)
     *
     * @dev Reverts if the wallet has already voted on this company — use
     *      changeVote() instead. Non-payable: paying app fees is impossible.
     *      Gas: one SSTORE to userVote, one SSTORE to a counter, one to time.
     */
    function vote(uint8 companyId, Sentiment sentiment)
        external
        validCompany(companyId)
        validSentiment(sentiment)
    {
        // A wallet that has voted has a non-None entry. Block double-voting.
        require(userVote[companyId][msg.sender] == Sentiment.None, "Already voted");

        // Record the wallet's choice.
        userVote[companyId][msg.sender] = sentiment;
        lastVoteAt[companyId][msg.sender] = block.timestamp;

        // Bump the matching tally.
        if (sentiment == Sentiment.Bullish) {
            bullishCount[companyId] += 1;
        } else {
            bearishCount[companyId] += 1;
        }

        emit Voted(msg.sender, companyId, sentiment);
    }

    /**
     * @notice Change a vote you've already cast (e.g. bull -> bear).
     * @param companyId     which company
     * @param newSentiment  the new Bullish/Bearish choice (must differ from current)
     *
     * @dev Requires: you have an existing vote, the cooldown has elapsed, and
     *      the new choice is actually different. Moves one unit from the old
     *      tally to the new one — total vote count is unchanged.
     */
    function changeVote(uint8 companyId, Sentiment newSentiment)
        external
        validCompany(companyId)
        validSentiment(newSentiment)
    {
        Sentiment current = userVote[companyId][msg.sender];

        // Must already have a vote to change it.
        require(current != Sentiment.None, "No vote to change");

        // No-op flips waste gas and muddy events — reject them.
        require(current != newSentiment, "Same sentiment");

        // Anti-spam: enforce the cooldown window between vote actions.
        require(
            block.timestamp >= lastVoteAt[companyId][msg.sender] + CHANGE_COOLDOWN,
            "Cooldown active"
        );

        // Apply the new choice and reset the cooldown clock.
        userVote[companyId][msg.sender] = newSentiment;
        lastVoteAt[companyId][msg.sender] = block.timestamp;

        // Move the tally: remove from old bucket, add to new bucket.
        if (current == Sentiment.Bullish) {
            bullishCount[companyId] -= 1;
            bearishCount[companyId] += 1;
        } else {
            bearishCount[companyId] -= 1;
            bullishCount[companyId] += 1;
        }

        emit VoteChanged(msg.sender, companyId, current, newSentiment);
    }

    // ---------------------------------------------------------------------
    // Read functions (free — no gas when called off-chain)
    // ---------------------------------------------------------------------

    /**
     * @notice Get the tallies for one company in a single call.
     * @return bull   number of bullish votes
     * @return bear   number of bearish votes
     * @return total  bull + bear
     */
    function getResults(uint8 companyId)
        external
        view
        validCompany(companyId)
        returns (uint256 bull, uint256 bear, uint256 total)
    {
        bull = bullishCount[companyId];
        bear = bearishCount[companyId];
        total = bull + bear;
    }

    /**
     * @notice Look up how a specific wallet voted on a company.
     * @return The wallet's Sentiment (None if it hasn't voted).
     * @dev Lets the frontend highlight the button the user already picked.
     */
    function getUserVote(uint8 companyId, address wallet)
        external
        view
        returns (Sentiment)
    {
        return userVote[companyId][wallet];
    }

    /**
     * @notice Seconds remaining before `wallet` may change its vote.
     * @return 0 if the wallet can change now (or has never voted), else the wait.
     * @dev Convenience for the UI to show a "you can change in X min" countdown.
     */
    function changeCooldownRemaining(uint8 companyId, address wallet)
        external
        view
        returns (uint256)
    {
        uint256 unlockAt = lastVoteAt[companyId][wallet] + CHANGE_COOLDOWN;
        if (block.timestamp >= unlockAt) {
            return 0;
        }
        return unlockAt - block.timestamp;
    }
}
