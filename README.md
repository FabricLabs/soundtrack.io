🎧️ [soundtrack.io][soundtrack]
=============
collaborative music streaming over a peer-to-peer network

[![Build Status][badge-build-status]][test-home]
[![Coverage Status][badge-coverage-status]][coverage-home]
[![GitHub contributors][badge-contributors]][contributor-list]
[![Community][badge-community]][chat]

[soundtrack.io][soundtrack] is a collaborative online radio, almost like a jukebox for the Internet.

### Vote on what plays next, like Reddit for music.
The "Queue" shows all requested tracks, ordered by oldest first.  Upvote or downvote a track to add your vote, pushing it to the top or the bottom as per your preference.

### Reliable Streams
Soundtrack aggregates streams from sources like YouTube and SoundCloud, so when a song is queued, it has multiple locations to play from if any one source fails for any particular reason.

### Earn Bitcoin
Help others with reliability by hosting streams, earning Bitcoin in exchange for your node's work.  Deposit and withdraw using normal Bitcoin addresses, compatible with all major wallets.

## Quick Start
1. `npm install -g FabricLabs/soundtrack`
2. `soundtrack`

## Configuration
Supply environment variables `FABRIC_PORT` and/or `FABRIC_SEED` for Fabric
peer-to-peer communication and persistent storage, respectively.

## Earning Bitcoin
Income can only be generated for online nodes, through an opt-in program.

To enable earning, be sure to provide `FABRIC_SEED` with a mnemonic and use:

```
$ soundtrack --earn
```

Be sure to back up your keys — we are not responsible for any losses!

## API
`TODO: npm run make:api`

## Contributing
[Fork. Commit. Pull request.](https://help.github.com/articles/fork-a-repo)

[soundtrack]: https://soundtrack.io
[badge-build-status]: https://img.shields.io/travis/FabricLabs/soundtrack.svg?branch=mastere&style=flat-square
[badge-coverage-status]: https://img.shields.io/codecov/c/gh/FabricLabs/soundtrack?style=flat-square
[badge-contributors]: https://img.shields.io/github/contributors/FabricLabs/soundtrack.svg?style=flat-square
[badge-community]: https://img.shields.io/matrix/soundtrack:fabric.pub.svg?style=flat-square
[test-home]: https://travis-ci.org/FabricLabs/soundtrack
[coverage-home]: https://codecov.io/gh/FabricLabs/soundtrack
[contributor-list]: https://github.com/FabricLabs/soundtrack/graphs/contributors
[chat]: https://chat.fabric.pub/#/room/#soundtrack:fabric.pub
