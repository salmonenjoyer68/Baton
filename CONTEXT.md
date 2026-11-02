# Baton

A browser environment for learning orchestration: the conductor hands instruments to a seven-performer ensemble playing a shared eight-beat loop, and rates the takes a local model proposes when it is handed one of those instruments.

## Language

### Product and roles

**Baton**:
The product: a browser environment where one person orchestrates seven performers on a shared loop.
_Avoid_: app, platform, the Baton game

**Orchestration**:
Deciding which performer plays which instrument, and what that instrument plays.
_Avoid_: mixing, conducting

**Mixing**:
The audible result of the seven performers sounding together.
_Avoid_: orchestration

**Conductor**:
The person using Baton — the one who hands out instruments, triggers takes, and rates them.
_Avoid_: player, user

**Performer**:
Whoever plays an instrument in a slot: either a character the conductor assigned an instrument to, or a model handed one.
_Avoid_: player, musician, agent, AI

**Model**:
A locally served language model that can be handed a slot; it proposes patterns for the single instrument it was given.
_Avoid_: agent, AI musician, LLM, bot

### The ensemble and the stage

**Character**:
One of the seven animated figures on the stage.
_Avoid_: avatar, sprite

**Slot**:
The position holding one assignment: an instrument, its performer, and whether it is muted or soloed. There is exactly one slot per character.
_Avoid_: seat, position

**Assignment**:
An instrument placed in a slot, together with the performer that plays it.
_Avoid_: placement, loadout

**Handoff**:
Giving a slot's assignment to a model, so the model rather than the conductor decides that instrument's pattern.
_Avoid_: delegation, AI mode

**Stage**:
The area holding the seven slots.
_Avoid_: board, grid

**Shelf**:
The area listing the twenty instruments, grouped by category.
_Avoid_: palette, tray, dock

**Category**:
One of the four groupings of instruments: beats, melody, effects, voices.
_Avoid_: group, section, instrument type

**Instrument**:
One of the twenty playable sounds — the unit a conductor hands to a performer.
_Avoid_: sound (in prose), patch, voice

**Sound**:
The code-level name for an instrument's data. In prose, say instrument.
_Avoid_: —

### Music and timing

**Loop**:
Eight beats: the repeating unit the whole ensemble shares.
_Avoid_: bar, phrase, measure

**Beat**:
One position within the loop, and the pulse that drives it.
_Avoid_: step, tick

**Pattern**:
The eight velocities an instrument plays across one loop.
_Avoid_: steps, sequence, groove, line

**Velocity**:
How loudly an instrument sounds on one beat, from 0 to 1. Zero means silence.
_Avoid_: volume, gain, level

**Authored pattern**:
The pattern written by hand for an instrument, as opposed to one proposed by a model.
_Avoid_: default pattern, original pattern

**Override**:
A slot's pattern replacing the instrument's authored pattern for that performer only. The instrument itself never changes.
_Avoid_: edit, mutation, custom pattern

**Recipe**:
The synthesis definition behind an instrument: its tone, noise, and envelope. Never the whole instrument.
_Avoid_: patch, preset, sound

**Layer**:
The audio of one slot while it is playing.
_Avoid_: track, channel, voice

### The model's turn

**Take**:
One pattern a model proposes for the instrument it was handed.
_Avoid_: generation, attempt, output, draft

**Rating**:
The conductor's accept or reject verdict on a take.
_Avoid_: score, feedback, vote

**Take log**:
The record of past takes and their ratings, shown to the model when it proposes its next take.
_Avoid_: history, memory, context
