# Architecture

The coordinator owns shared musical state and schedules performers in parallel.
Validated patterns are delivered to the frontend over WebSocket.

"Conductor" is reserved for the person using Baton. "Performer" is whoever plays
a slot — a character the conductor assigned an instrument to, or a model handed
one. See `CONTEXT.md` for the rest of the vocabulary.
