import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/app/lib/pusherServer";

// --- INSECURE IMPLEMENTATION ---
// Reads user ID directly from a custom header sent by the client.
// This is NOT secure and relies on trusting the client.
async function getServerSessionUserId(
  request: NextRequest
): Promise<string | number | null> {
  const userIdFromHeader = request.headers.get("X-User-ID")?.toString(); // Read the custom header
  // --- Add Logging ---
  console.log(
    "[Pusher Auth] Received Headers:",
    Object.fromEntries(request.headers)
  );
  console.log("[Pusher Auth] X-User-ID Header Value:", userIdFromHeader);

  console.log("[Pusher Auth] X-User-ID Header Value:", userIdFromHeader);
  if (userIdFromHeader) {
    console.warn(
      `Pusher Auth: [INSECURE] Authenticating using X-User-ID header: ${userIdFromHeader}`
    );
    // Try to detect if it's numeric and return appropriate type
    if (!isNaN(Number(userIdFromHeader))) {
      return Number(userIdFromHeader);
    }
    return userIdFromHeader; // Return the ID found in the header
  } else {
    console.error(
      "Pusher Auth: [INSECURE] X-User-ID header not found. Cannot authenticate."
    );
    return null; // No header found
  }
}
// --- End INSECURE IMPLEMENTATION ---

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channel = formData.get("channel_name") as string;

    console.log(
      `[Pusher Auth] Received auth request for channel: ${channel}, socketId: ${socketId}`
    );
    console.log(
      `[Pusher Auth] Form data:`,
      Object.fromEntries(formData.entries())
    );

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: "Bad Request: Missing parameters" },
        { status: 400 }
      );
    }

    // --- 1. Get User ID (using the insecure header method) ---
    const userId = await getServerSessionUserId(request);
    console.log(`[Pusher Auth] User ID from header function: ${userId}`); // Log retrieved userId

    if (!userId) {
      // If header is missing
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication header" },
        { status: 403 }
      );
    }
    // --- End Get User ID ---

    // --- 2. Authorize based on channel name and user ID ---
    const channelParts = channel.match(/^private-(admin|client)-(.+)$/);
    if (!channelParts) {
      return NextResponse.json(
        { error: "Invalid channel name format" },
        { status: 400 }
      );
    }
    const channelUserId = channelParts[2];
    console.log(`[Pusher Auth] User ID from channel name: ${channelUserId}`); // Log channelUserId

    console.log(`[Pusher Auth] Channel details: ID=${channelUserId}`);
    console.log(
      `[Pusher Auth] User ID comparison: Header=${userId} (${typeof userId}), Channel=${channelUserId} (${typeof channelUserId})`
    );

    // Try multiple comparison methods
    const stringMatch = String(userId) === String(channelUserId);
    const numericMatch =
      !isNaN(Number(userId)) &&
      !isNaN(Number(channelUserId)) &&
      Number(userId) === Number(channelUserId);

    console.log(`[Pusher Auth] String comparison result: ${stringMatch}`);
    console.log(`[Pusher Auth] Numeric comparison result: ${numericMatch}`);

    // Accept if either comparison method succeeds
    if (!stringMatch && !numericMatch) {
      console.error(
        `Pusher Auth: Forbidden attempt - User ${userId} (from header) tried to access channel ${channel} for user ${channelUserId}`
      );
      return NextResponse.json(
        {
          error: `Forbidden: Channel access denied - ID mismatch (${userId} vs ${channelUserId})`,
        },
        { status: 403 }
      );
    }
    // **Security Check (still useful even with insecure ID retrieval):**
    // Ensure the ID from the header matches the channel being requested.
    // **Security Check (still useful even with insecure ID retrieval):**
    console.log(
      `[Pusher Auth] Comparing Header User ID (${userId}, type: ${typeof userId}) with Channel User ID (${channelUserId}, type: ${typeof channelUserId})`
    ); // Log comparison values

    if (String(userId) !== channelUserId) {
      console.error(
        `Pusher Auth: Forbidden attempt - User ${userId} (from header) tried to access channel ${channel} for user ${channelUserId}`
      );
      return NextResponse.json(
        { error: "Forbidden: Channel access denied" },
        { status: 403 }
      );
    }
    // --- End Authorization Logic ---

    const userData = { user_id: String(userId) };

    console.log(
      `Pusher Auth: Authorizing user ${userId} (socket: ${socketId}) for channel ${channel}`
    );
    const authResponse = pusherServer.authorizeChannel(
      socketId,
      channel,
      userData
    );
    console.log(
      "[Pusher Auth] Authorization successful. Response:",
      authResponse
    ); // Log success

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher Auth Error:", error);
    return NextResponse.json(
      { error: "Authentication failed due to server error" },
      { status: 500 }
    );
  }
}
