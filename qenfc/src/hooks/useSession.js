import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useSession() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = logged out

  const refresh = useCallback(() => {
    api.me().then((d) => setUser(d.user)).catch(() => setUser(null))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { user, loading: user === undefined, refresh }
}
