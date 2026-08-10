# n8n-nodes-ictcore

An n8n community node for [ICTCore](https://github.com/ictinnovations/ictcore), the open source telephony engine from [ICT Innovations](https://ictinnovations.com). Send faxes, place calls, manage contacts and run outbound campaigns straight from a workflow.

One node and one credential cover three products, because all three run on ICTCore:

- [ICTFax](https://ictfax.com)
- [ICTPBX](https://ictpbx.com)
- [open source ICTDialer](https://github.com/ictinnovations/ictdialer)

Point the base URL at whichever server you want to drive.

> **Which ICTDialer?** Two different products share the name. The open source [ICTDialer](https://github.com/ictinnovations/ictdialer) is built on FreeSWITCH and ICTCore, so it uses this node. [ICTDialer.com](https://ictdialer.com) is the hosted edition of [ICTContact](https://ictcontact.com) and is Asterisk based, so it uses [n8n-nodes-ictcontact](https://www.npmjs.com/package/n8n-nodes-ictcontact).

## Install

In n8n, go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-ictcore
```

Self-hosted n8n only. n8n Cloud doesn't allow unverified community nodes that make arbitrary HTTP calls.

Manual install:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-ictcore
```

Restart n8n afterwards.

## Credential

| Field | Value |
|-------|-------|
| Base URL | Your server without the `/api` suffix, for example `https://pbx.example.com` |
| Authentication | Username and password, or a bearer token from `POST /authenticate` |
| Ignore SSL Issues | Turn this on if your box still runs a self-signed certificate |

Hit **Test** after filling it in. The test lists contacts, which is the lightest authenticated read ICTCore offers.

## Operations

**Fax**
- **Send** runs the whole ICTCore fax sequence in one step: creates the contact, creates the document, uploads your binary file, builds a sendfax program, creates the transmission and fires it. Optionally waits for the result.
- Get Many, Download

**Call**
- Originate, Get Many

**Contact**
- Create, Get, Get Many, Update, Delete

**Group**
- Create, Get Many, Delete, Add Contact, Get Contacts

**Campaign**
- Create, Get, Get Many, Start, Stop, Delete

**Transmission**
- Get, Get Many, Send, Retry, Get Status, Get Result

**Extension** (ICTPBX)
- Create, Get Many, Delete, Get Next Available

**Report**
- Get CDR, Get Statistics

## About the fax Send operation

Sending a fax through the raw ICTCore API takes six calls in a fixed order. Getting one of them wrong leaves orphaned records on the server, which is annoying to clean up. The **Send** operation does the whole sequence for you:

```
POST /contacts                        create the recipient
POST /messages/documents              register the document
PUT  /messages/documents/{id}/media   upload the file bytes
POST /programs/sendfax                build the program
POST /transmissions                   bind contact to program
POST /transmissions/{id}/send         send it
```

Feed it a binary property from a previous node (a Read Binary File, an HTTP Request, an email attachment) and a destination number, and you're done.

## There are no webhooks

ICTCore has no outbound webhook or event stream, so nothing can push a delivery result back into n8n. If you need to know whether a fax landed, either switch on **Wait for Result** in the Send operation, or add a Schedule Trigger that polls **Transmission → Get Status**. The node's wait helper polls until the status leaves `pending`, `processing`, `scheduled` or `ready`.

## Example: fax every invoice PDF that lands in a folder

```
Local File Trigger  →  Read Binary File  →  ICTCore (Fax: Send)  →  Slack
```

Set **Wait for Result** on the ICTCore node and the Slack message can report whether the fax actually went through.

## Compatibility

Tested against n8n 1.x. Needs Node.js 20.15 or newer, which is what n8n itself requires.

## Related nodes

- [n8n-nodes-ictbroadcast](https://www.npmjs.com/package/n8n-nodes-ictbroadcast) for [ICTBroadcast](https://ictbroadcast.com)
- [n8n-nodes-ictcontact](https://www.npmjs.com/package/n8n-nodes-ictcontact) for [ICTContact](https://ictcontact.com) and [ICTDialer.com](https://ictdialer.com)

## Links

- [ICTCore on GitHub](https://github.com/ictinnovations/ictcore)
- [ICTPBX REST API reference](https://ictpbx.com/ictpbx-rest-api/)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
