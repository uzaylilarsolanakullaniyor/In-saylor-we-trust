# Treasury Sentiment

On-chain bull/bear voting for crypto treasury companies, with live off-chain P/L
from CoinGecko. Built for **Base** (Coinbase L2), publishable as a Base App / Farcaster Mini App.

- **Companies:** Strategy (MSTR / BTC), BitMine (BMNR / ETH), Forward (FWDI / SOL)
- **Contract:** `contracts/SentimentVoting.sol` — gas-only voting, 1 vote/wallet/company, cooldown to change
- **Frontend:** React + wagmi + viem (`frontend/`)
- **Data:** CoinGecko `/companies/public_treasury/{coin}` → P/L computed client-side
