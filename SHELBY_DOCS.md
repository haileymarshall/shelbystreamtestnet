# Shelby Protocol Docs Consolidated

Compiled from the official Shelby docs on 2026-05-16.

Primary source root: <https://docs.shelby.xyz/protocol>

## Scope

This document condenses the current official Shelby protocol docs and the closely related official SDK pages that matter for moving an app from `shelbynet` to Shelby `testnet`.

It is not a replacement for the official docs. It is a clean working reference built from them.

## Executive Summary

Shelby is a decentralized blob-storage protocol built for read-heavy workloads such as video streaming, AI data access, and large analytics workloads. It combines:

- Aptos smart contracts for coordination, settlement, audits, and participation state.
- Shelby RPC servers as the user-facing read/write interface.
- Storage Provider nodes that hold erasure-coded data.
- A private network between RPCs and Storage Providers for performance.

For an application team, the main migration surface from `shelbynet` to `testnet` is:

- switch Shelby RPC and Aptos endpoints
- switch your SDK network configuration to `testnet`
- obtain `testnet` API keys from Geomi
- fund accounts with testnet APT and ShelbyUSD if your workflow needs on-chain writes or paid operations

If you are not planning to operate Shelby infrastructure yourself, most of the "Cavalier" and "RPC Node" material is operator-only background.

## Networks

As of 2026-05-16, the live official docs list both `testnet` and `shelbynet`.

### `testnet`

Official docs currently list these values:

| Component | Value |
| --- | --- |
| Indexer | `https://api.testnet.aptoslabs.com/v1/graphql` |
| Shelby RPC | `https://api.testnet.shelby.xyz/shelby` |
| Aptos Full Node | `https://api.testnet.aptoslabs.com/v1` |
| Shelby smart contract account | `0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a` |

The current docs leave several `testnet` details as `TBD`, including:

- network limits and capabilities
- RPC server notes
- storage-provider notes

### `shelbynet`

Official docs currently list these values:

| Component | Value |
| --- | --- |
| Indexer | `https://api.shelbynet.shelby.xyz/v1/graphql` |
| Shelby RPC | `https://api.shelbynet.shelby.xyz/shelby` |
| Aptos Full Node | `https://api.shelbynet.shelby.xyz/v1` |
| Shelby smart contract account | `0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a` |

The docs describe `shelbynet` as a developer prototype network that can be wiped roughly weekly and is isolated from Aptos mainnet, Aptos testnet, and Aptos devnet.

## What Applies To You

### If you are deploying an app on Shelby

These are the pages that matter most:

- Protocol introduction
- Networks
- Quick Start
- TypeScript SDK getting started
- API keys
- Funding tokens
- RPC architecture and smart-contract overview

Typical app-builder responsibilities:

- initialize Shelby SDK clients against the right network
- use the right Shelby RPC, Aptos fullnode, and indexer endpoints
- use the right API key type
- fund the wallet that performs paid writes or transactions
- point your frontend and backend env vars at `testnet`

### If you are also operating Shelby infrastructure

These additional pages matter:

- Nodes and Infrastructure
- Cavalier Setup
- RPC Node
- Storage Providers

These operator pages cover SP registration, disk layout, BLS and Aptos keys, hugepages, `tc` shaping, and placement-group activation.

## Quick Start Paths

The official protocol quickstart is intentionally short. It pushes builders toward one of two interfaces:

- the Shelby CLI
- the TypeScript SDK

The docs also point to:

- the `shelby/shelby-quickstart` GitHub repository
- the SDK documentation
- the RPC API documentation

## TypeScript SDK

The official TypeScript SDK docs show both Node and browser usage.

Install:

```bash
npm install @shelby-protocol/sdk @aptos-labs/ts-sdk
```

Typical Node-side pattern:

- use `ShelbyNodeClient`
- set `network: Network.TESTNET`
- provide your API key

Typical browser-side pattern:

- use `ShelbyClient`
- set `network: Network.TESTNET`
- provide a client-safe API key when appropriate

The SDK docs present the SDK as the primary integration surface for applications.

## API Keys

The official API-key flow uses Geomi.

Purpose of API keys:

- app authentication
- higher rate limits
- usage tracking
- access to enhanced service tiers

Acquisition flow in the official docs:

1. Open `geomi.dev`.
2. Sign in or create an account.
3. Create an API Resource.
4. Select `Testnet`.
5. name the resource and describe the use case.
6. generate the key.

Important distinction from the docs:

- the default generated key is intended for private server use
- if the key will be exposed in a frontend context, create a client key instead

The docs also show the same API key concept being used for Aptos clients through `clientConfig.API_KEY`.

## Funding and Tokens

The funding page is brief. It says accounts may be funded with:

- ShelbyUSD tokens
- Aptos APT tokens

The storage-provider setup page also explicitly points operators to the Aptos testnet faucet for gas funding.

For app deployment, the practical takeaway is:

- you need testnet APT for Aptos transactions
- you may need ShelbyUSD depending on the payment path your app uses

## Core Protocol Architecture

Shelby is built around four main pieces:

- Aptos smart contract
- Storage Providers
- Shelby RPC servers
- private network connectivity between RPCs and Storage Providers

User traffic normally enters through the RPC layer over the public internet. The RPC then reaches storage over Shelby's private backbone.

## Accounts and Blob Naming

Shelby stores blobs in an account-scoped namespace.

Rules described by the docs:

- the namespace is the hex Aptos account
- blob names are user-defined
- names must be unique within an account namespace
- names can be up to 1024 characters
- names must not end with `/`
- Shelby does not have real directories; path-like names are conventions

Example implication:

- both `<account>/foo` and `<account>/foo/bar` can exist

The docs note that CLI and tooling use a canonical directory-style naming convention for recursive upload and download, but the protocol itself does not enforce real directory semantics.

## Chunking and Erasure Coding

The current docs describe the storage layout this way:

- data is divided into chunksets
- chunksets are erasure-coded into chunks
- each chunkset represents 10 MB of user data
- each chunk is 1 MB
- each chunkset yields 16 chunks total
- 10 chunks are original data
- 6 chunks are parity

Operational meaning:

- any 10 of the 16 chunks are enough to reconstruct a chunkset
- the protocol uses Clay Codes for efficient repair
- repair traffic can be substantially lower than standard Reed-Solomon style recovery

The SDK pads the tail of a blob internally when needed so chunk boundaries remain valid. Reads do not return the padding.

## Placement Groups

Shelby groups blob placement at the placement-group level instead of tracking every chunk separately on-chain.

Meaning:

- a blob is assigned to a placement group
- the 16 chunks for that blob live across the 16 storage-provider slots in that group
- this reduces metadata overhead
- it also gives Shelby a clean way to reason about locality and availability structure

## Read Flow

The docs describe the read path at a high level:

1. the client selects an RPC server
2. the client establishes payment/session state with that RPC
3. the client requests a full blob or byte range
4. the RPC may satisfy from local cache
5. the RPC looks up blob metadata and placement data
6. the RPC fetches enough chunks from Storage Providers over the private network
7. the RPC validates and reconstructs the requested data
8. the session can be reused for additional paid reads

Important read-path details from the docs:

- direct HTTP reads are supported for some use cases
- range requests are supported
- the RPC can over-request chunks to lower tail latency and complete once enough chunks arrive
- micropayment channels are used between RPCs and Storage Providers

## Write Flow

The docs describe the write path at a high level:

1. client selects an RPC server
2. SDK erasure-codes the blob locally in a streaming fashion
3. SDK computes commitments
4. SDK submits on-chain metadata and payment information
5. SDK sends original blob data to the RPC
6. RPC independently recomputes coding and commitments
7. RPC verifies consistency with on-chain metadata
8. RPC distributes coded chunks to Storage Providers
9. Storage Providers acknowledge storage
10. RPC aggregates acknowledgements on-chain
11. contract marks the blob as durably written

This split gives Shelby on-chain correctness checks without forcing raw user payloads onto the chain.

## Smart Contracts

The official docs position the Shelby smart contracts as the system's single source of truth for:

- blob commitments and metadata
- audit outcomes
- micropayment channel metadata
- system participation state

### Smart-contract roles in writes

The contract:

- accepts the blob registration transaction
- charges for writes according to size and expiration
- assigns a placement group
- records acknowledgements until the blob becomes fully written

If an RPC becomes unavailable, a Storage Provider can still submit an acknowledgement directly on-chain.

### Smart-contract roles in reads

Reads do not need an on-chain state change on the critical path. RPCs and clients read contract state directly or through indexer-derived data.

### Micropayment channels

Shelby uses micropayment-channel contracts so reads can happen off-chain during the session and only need on-chain creation and settlement at the boundaries.

### Participation and audits

The smart contract manages:

- Storage Provider membership
- placement groups
- provider-to-slot mappings

The docs also describe periodic audits:

- write payments are deposited on registration
- only providers that acknowledged writes are eligible for those write payments
- providers that cannot later prove storage during audit can be penalized

## RPC Servers

The official docs describe RPC servers as the main application-facing protocol layer.

Capabilities highlighted in the docs:

- REST-style read/write blob APIs
- range requests
- multipart upload support
- session and payment handling
- connection management to Storage Providers
- erasure-coding and commitment work inside the write/read pipeline
- Aptos integration for metadata and settlement logic

Performance characteristics emphasized by the docs:

- streaming data path
- constant-memory style processing per connection
- connection pooling to Storage Providers
- bounded queues and backpressure
- mostly stateless scaling model
- request correlation IDs and operational metrics

## Storage Providers and Cavalier

The official Storage Provider implementation is `Cavalier`, a high-performance C codebase from Jump Crypto.

The docs explain Cavalier through a tile-based design:

- independent isolated processes pinned to dedicated CPU resources
- shared-memory communication between tiles
- emphasis on locality, predictability, and isolation

Tile roles described in the docs:

1. server tiles for RPC communication
2. engine tile for disk access
3. client tile for Aptos/L1 state access
4. rebuild tile for chunk repair
5. sign tile for acknowledgements and transactions

## Nodes and Infrastructure

The official node-setup landing page currently says:

- Shelby is in Early Access on `testnet`
- access is public
- infrastructure setup is managed
- teams interested in running a testnet node should contact Shelby through email or Discord

This matters because it means public app usage and operator participation are not the same thing. Using testnet as an app developer is one track; joining as an infrastructure operator is another.

## Cavalier Setup Summary

The storage-provider setup doc is Linux x64 only and assumes comfort with:

- `udev`
- `bash`
- `systemd`
- root or root-equivalent access

Major setup phases described by the docs:

1. unpack the provided source bundle
2. install build dependencies
3. build `cavalier` and support binaries
4. decide whether to use raw block devices
5. create an Aptos `testnet` account
6. extract the Aptos private key to its own file
7. generate a BLS12-381 keypair
8. acquire a Geomi API key for `testnet`
9. write the Cavalier config file
10. run `cavalier ... init`
11. register the Storage Provider

The docs warn that storage initialization can wipe disks or files.

### SP Registration Flow

The docs recommend the `sp_register.py` script and split registration into two phases:

1. initialize the SP and set up payment channels
2. activate placement-group slots after the Shelby team assigns the provider to a placement group

That is a strong indication that Storage Provider onboarding is coordinated rather than fully self-serve.

## RPC Node Setup Summary

The RPC-node page is focused on testnet bandwidth shaping.

Its purpose is to cap ingress bandwidth using Linux traffic control so one node does not overwhelm shared testnet capacity.

Key ideas from that page:

- identify the DoubleZero-facing interface
- redirect ingress TCP traffic to an IFB device
- apply HTB plus `fq_codel` shaping on the IFB
- verify the resulting filters, qdiscs, and classes with `tc`

This page is operator-facing only. It is not required for deploying a frontend or backend that merely consumes Shelby services.

## White Paper Summary

The white-paper page links to the full PDF and frames Shelby around a few central claims:

- decentralized storage alternatives have not served high-performance production workloads well enough
- Shelby separates control and data planes
- Shelby uses erasure coding with lower recovery overhead
- Shelby pays for reads to align incentives with performance
- Shelby uses audits to preserve cryptoeconomic integrity without making the system slow

## Token-Economics Summary

The current token-economics page is still partial. It says full tokenomics are not yet published.

What the live docs do specify:

- users pay in Shelby token or stablecoins
- read fees go to RPC operators
- storage fees flow on-chain
- stablecoin storage fees may be converted into Shelby token
- Storage Providers are rewarded in the native token
- rewards are audit-conditioned and released gradually
- a portion of conversions is burned
- staking exists for Storage Providers and RPC operators
- delegation exists
- total supply is capped

## What The Official Docs Still Leave Open

The current official docs still leave several gaps that matter for production planning:

- `testnet` limits/capacity are not specified
- `testnet` RPC-server and SP operational notes are marked `TBD`
- the tokenomics page is explicitly incomplete
- node/operator onboarding appears coordinated with the Shelby team rather than fully open

## Practical Testnet Migration Checklist For An App Team

If your app is already working on `shelbynet`, the official docs imply this migration checklist:

1. switch RPC base URL to `https://api.testnet.shelby.xyz/shelby`
2. switch Aptos fullnode URL to `https://api.testnet.aptoslabs.com/v1`
3. switch indexer URL to `https://api.testnet.aptoslabs.com/v1/graphql`
4. set SDK network to `Network.TESTNET`
5. create `testnet` Geomi API keys
6. use a client key only where frontend exposure is intended
7. fund the relevant account(s) with testnet APT
8. ensure your payment path has the required ShelbyUSD if your workflow depends on it
9. verify that any hardcoded network names, explorers, faucet links, and contract assumptions are no longer `shelbynet`-specific

## Official Source Index

Protocol:

- <https://docs.shelby.xyz/protocol>
- <https://docs.shelby.xyz/protocol/quickstart>
- <https://docs.shelby.xyz/protocol/architecture/overview>
- <https://docs.shelby.xyz/protocol/architecture/rpcs>
- <https://docs.shelby.xyz/protocol/architecture/storage-providers>
- <https://docs.shelby.xyz/protocol/architecture/smart-contracts>
- <https://docs.shelby.xyz/protocol/architecture/token-economics>
- <https://docs.shelby.xyz/protocol/architecture/white-paper>
- <https://docs.shelby.xyz/protocol/architecture/networks>
- <https://docs.shelby.xyz/protocol/node-setup>
- <https://docs.shelby.xyz/protocol/node-setup/cavalier>
- <https://docs.shelby.xyz/protocol/node-setup/testnet_rpc>

SDK pages used to fill in the missing testnet builder details:

- <https://docs.shelby.xyz/sdks/typescript>
- <https://docs.shelby.xyz/sdks/typescript/acquire-api-keys>
- <https://docs.shelby.xyz/sdks/typescript/fund-your-account>
