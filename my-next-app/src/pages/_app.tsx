import { useEffect } from "react";

function MyApp({ Component, pageProps }: any) {
  useEffect(() => {
    // Fetch the WebSocket API route to initialize the server
    fetch("/api/socket");
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
