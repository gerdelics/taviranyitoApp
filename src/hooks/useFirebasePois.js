import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ref as dbRef, onValue, set, update, remove } from 'firebase/database'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../firebase'
import { haversineKm } from '../utils/geo'
import { DEFAULT_POI_TYPE } from '../utils/poiTypes'

export function useFirebasePois(pairKey, { onNewPoi } = {}) {
  const [pois, setPois] = useState([])
  const prevPublishedIdsRef = useRef(null)
  const onNewPoiRef = useRef(onNewPoi)
  const poisRef = useRef(pois)
  useEffect(() => { onNewPoiRef.current = onNewPoi })
  useEffect(() => { poisRef.current = pois }, [pois])

  useEffect(() => {
    if (!pairKey) return
    prevPublishedIdsRef.current = null
    const poisRef = dbRef(db, `taviranyito/drives/${pairKey}/pois`)
    const unsubscribe = onValue(poisRef, (snapshot) => {
      const data = snapshot.val()
      const list = data
        ? Object.values(data)
            .map((poi) => ({ ...poi, approach: poi.approach ?? null }))
            .sort((a, b) => {
              const oa = a.order ?? Infinity
              const ob = b.order ?? Infinity
              return oa !== ob ? oa - ob : (a.createdAt ?? 0) - (b.createdAt ?? 0)
            })
        : []

      if (prevPublishedIdsRef.current !== null) {
        const prevPublished = prevPublishedIdsRef.current
        list
          .filter((p) => p.published === true && !prevPublished.has(p.id))
          .forEach((p) => onNewPoiRef.current?.(p))
      }
      prevPublishedIdsRef.current = new Set(
        list.filter((p) => p.published === true).map((p) => p.id),
      )
      setPois(list)
    })
    return unsubscribe
  }, [pairKey])

  const addPoi = useCallback(
    (lat, lon, details = {}) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !pairKey) return null
      const poiData = {
        id: uuidv4(),
        lat,
        lon,
        done: false,
        description: details.description?.trim() || '',
        type: details.type || DEFAULT_POI_TYPE,
        createdAt: Date.now(),
        published: details.published ?? false,
        order: poisRef.current.length,
      }
      if (details.approach != null) poiData.approach = details.approach
      set(dbRef(db, `taviranyito/drives/${pairKey}/pois/${poiData.id}`), poiData)
      return { ...poiData, approach: null }
    },
    [pairKey],
  )

  const editPoi = useCallback(
    (id, patch) => {
      if (!pairKey) return
      update(dbRef(db, `taviranyito/drives/${pairKey}/pois/${id}`), patch)
    },
    [pairKey],
  )

  const deletePoi = useCallback(
    (id) => {
      if (!pairKey) return
      remove(dbRef(db, `taviranyito/drives/${pairKey}/pois/${id}`))
    },
    [pairKey],
  )

  const clearAll = useCallback(() => {
    if (!pairKey) return
    remove(dbRef(db, `taviranyito/drives/${pairKey}/pois`))
  }, [pairKey])

  const reorderPois = useCallback(
    (newOrderedIds) => {
      if (!pairKey) return
      const patch = {}
      newOrderedIds.forEach((id, i) => { patch[`${id}/order`] = i })
      update(dbRef(db, `taviranyito/drives/${pairKey}/pois`), patch)
    },
    [pairKey],
  )

  const getNearestId = useCallback(
    (currentLocation) => {
      if (
        !currentLocation ||
        !Number.isFinite(currentLocation.lat) ||
        !Number.isFinite(currentLocation.lon)
      ) {
        return null
      }
      let nearestId = null
      let nearestKm = Infinity
      for (const poi of pois) {
        if (poi.done) continue
        const distanceKm = haversineKm(currentLocation, poi)
        if (distanceKm < nearestKm) {
          nearestKm = distanceKm
          nearestId = poi.id
        }
      }
      return nearestId
    },
    [pois],
  )

  return useMemo(
    () => ({ pois, addPoi, editPoi, deletePoi, clearAll, reorderPois, getNearestId }),
    [pois, addPoi, editPoi, deletePoi, clearAll, reorderPois, getNearestId],
  )
}
