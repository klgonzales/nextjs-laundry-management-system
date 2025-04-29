import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/app/lib/pusherServer";

async function getServerSessionUserId(
  request: NextRequest
): Promise<string | null> {
  // Changed return type to string | null
  const userIdFromHeader = request.headers.get("X-User-ID")?.toString(); // Read the custom header

  console.log(
    "[Pusher Auth] Received Headers:",
    Object.fromEntries(request.headers)
  );
  console.log("[Pusher Auth] X-User-ID Header Value:", userIdFromHeader);

  if (userIdFromHeader) {
    console.warn(
      `Pusher Auth: [INSECURE] Authenticating using X-User-ID header: ${userIdFromHeader}`
    );
    // Always return the ID as a string
    return userIdFromHeader;
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

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: "Bad Request: Missing parameters" },
        { status: 400 }
      );
    }

    // --- 1. Get User ID (now always string | null) ---
    const userId = await getServerSessionUserId(request);
    console.log(
      `[Pusher Auth] User ID from header function: ${userId} (type: ${typeof userId})`
    );

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication header" },
        { status: 403 }
      );
    }
    // --- End Get User ID ---

    // --- 2. Authorize based on channel name and user ID ---
    // Use a pattern that matches admin or customer channels
    const channelParts = channel.match(/^private-(admin|customer)-(.+)$/);
    if (!channelParts) {
      // If it doesn't match, check if it's a different valid pattern (e.g., presence)
      // For now, assume only private-admin/customer are valid for this auth
      console.error(
        `[Pusher Auth] Invalid or unsupported channel format: ${channel}`
      );
      return NextResponse.json(
        { error: "Invalid channel name format" },
        { status: 400 }
      );
    }

    const channelUserType = channelParts[1]; // 'admin' or 'customer'
    const channelUserId = channelParts[2]; // The ID part of the channel name (string)

    console.log(
      `[Pusher Auth] Channel details: Type=${channelUserType}, ID=${channelUserId}`
    );
    console.log(
      `[Pusher Auth] Comparing Header ID: '${userId}' (${typeof userId}) vs Channel ID: '${channelUserId}' (${typeof channelUserId})`
    );

    // --- Simplified Authorization Check ---
    // Since both userId and channelUserId should now be strings, a simple comparison works.
    if (userId !== channelUserId) {
      console.error(
        `Pusher Auth: Forbidden attempt - User '${userId}' tried to access channel '${channel}' for user '${channelUserId}'`
      );
      return NextResponse.json(
        { error: "Forbidden: Channel access denied - ID mismatch" },
        { status: 403 }
      );
    }
    // --- End Simplified Authorization Check ---

    // If we reach here, authorization is successful
    const userData = { user_id: userId }; // user_id is already a string

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
    );

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher Auth Error:", error);
    return NextResponse.json(
      { error: "Authentication failed due to server error" },
      { status: 500 }
    );
  }
}
