Networked AI NPCs & Props in AR (Lens Studio)

A multiplayer AR experience built in Lens Studio where one user (the host) can generate and control AI-driven 3D characters and props in real time, and all connected users see and hear the same synchronized world.

The project combines real-time networking, AI dialogue, speech input/output, and dynamic 3D content generation.

======================== What This Project Demonstrates ========================

Multiplayer state synchronization using Snap’s Spectacles Sync Kit

Host-authoritative networking (clean separation of host vs audience logic)

Dynamic 3D asset generation via Snap3D

Real-time transform syncing for moving objects in shared AR space

AI-powered NPC conversations with speech input (ASR) and speech output (TTS)

Late-join handling so new users see the correct world state immediately

======================== Key Features ========================

AI NPC

Generated from a natural-language prompt

Maintains conversational context

Listens via on-device speech recognition

Speaks using AI text-to-speech

Position and movement synchronized across users



Networked Props

Host can spawn unlimited props at runtime

Each prop has a unique network identity

Live transform updates shared across devices

Late joiners receive existing props automatically


======================== Technical Highlights ========================

Lens Studio (TypeScript)

Spectacles Sync Kit (SyncEntity, StorageProperty, custom events)

Event-based transform replication (efficient + scalable)

OpenAI APIs for dialogue and speech

Clear authority model to avoid desyncs and feedback loops

======================== Architecture (High Level) ========================

One host creates and controls shared objects

Audience clients only receive and apply updates

Initial state is synced via shared properties

Ongoing movement is synced via lightweight network events

This mirrors patterns used in real-world multiplayer games and collaborative AR apps.


Snap3D

Spectacles Sync Kit

OpenAI (Chat + Speech)
