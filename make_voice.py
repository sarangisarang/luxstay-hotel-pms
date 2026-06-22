from openai import OpenAI

client = OpenAI()

script = """
Welcome to LuxStay — an AI-powered hotel management system for small and medium hotels.

LuxStay helps hotel teams manage bookings, rooms, guests, payments, invoices, housekeeping, concierge requests, analytics, and AI guest support from one platform.

This live demo uses protected demo accounts, so customers can explore the system safely without deleting or damaging real data.

On the dashboard, managers get a clear overview of today's hotel operations: occupancy, arrivals, departures, revenue, bookings, and active tasks.

Reception can manage the daily workflow, including check-ins, check-outs, guest profiles, room assignments, invoices, payments, and service requests.

The system also connects the front desk with operations such as housekeeping, concierge, maintenance, and guest services.

This helps hotel teams reduce manual work, avoid mistakes, and coordinate daily tasks from one place.

The AI assistant is connected to the hotel Knowledge Base.

When information exists, it gives a verified answer from the hotel's own data.

When information is missing, it refuses to invent and tells the guest to contact reception.

The AI evaluation page tests answerable questions, fallback cases, and refusal cases, helping the hotel monitor accuracy and hallucination resistance.

LuxStay also includes role-based access, protected demo mode, audit logs, secure authentication, and production-ready performance.

Guests only see their own information. Reception and admin users have access based on their responsibilities.

LuxStay is ready for pilot hotels that want a modern property management system with secure operations and AI-assisted guest support.
"""

print("Generating voiceover with voice: marin ...")

with client.audio.speech.with_streaming_response.create(
    model="gpt-4o-mini-tts",
    voice="marin",
    input=script,
    instructions=(
        "Speak in a calm, warm, professional female presentation style. "
        "Clear SaaS product demo narration. Natural pacing, confident but not exaggerated. "
        "Add small pauses between sections. Do not sound robotic."
    ),
    response_format="mp3",
) as response:
    response.stream_to_file("luxstay_voiceover.mp3")

print("Done: luxstay_voiceover.mp3")
