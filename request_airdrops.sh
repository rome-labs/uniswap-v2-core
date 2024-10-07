#!/bin/bash

curl --location 'http://geth:3000/airdrop' --header 'Content-Type: application/json' --data '{"recipientAddr": "0xa3349dE31ECd7fd9413e1256b6472a68c920D186", "amount": "100.0"}'
curl --location 'http://geth:3000/airdrop' --header 'Content-Type: application/json' --data '{"recipientAddr": "0x6970d087e7e78A13Ea562296edb05f4BB64D5c2E", "amount": "100.0"}'
curl --location 'http://geth:3000/airdrop' --header 'Content-Type: application/json' --data '{"recipientAddr": "0xaA4d6f4FF831181A2bBfD4d62260DabDeA964fF1", "amount": "100.0"}'
