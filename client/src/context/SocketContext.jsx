import { createContext, useContext, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

/**
 * Returns a function that gets (or lazily creates) a socket for a given namespace.
 * Sockets are cached by namespace and reused across component mounts.
 */
export function SocketProvider({ children }) {
  const sockets = useRef({});

  const getSocket = useCallback((namespace) => {
    if (!sockets.current[namespace]) {
      sockets.current[namespace] = io(namespace, {
        withCredentials: true,
        autoConnect: true,
      });
    }
    return sockets.current[namespace];
  }, []);

  const disconnect = useCallback((namespace) => {
    if (sockets.current[namespace]) {
      sockets.current[namespace].disconnect();
      delete sockets.current[namespace];
    }
  }, []);

  return (
    <SocketContext.Provider value={{ getSocket, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}
