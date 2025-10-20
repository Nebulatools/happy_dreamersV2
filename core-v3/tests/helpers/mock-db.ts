type Doc = Record<string, any>

export function mockDbWithCollections(cols: Record<string, Doc[]>) {
  function match(doc: Doc, query: any): boolean {
    for (const [k, v] of Object.entries(query)) {
      if (typeof v === 'object' && v && ('$gte' in v || '$lte' in v || '$gt' in v || '$lt' in v)) {
        const val = doc[k]
        if ('$gte' in v && !(val >= (v as any).$gte)) return false
        if ('$lte' in v && !(val <= (v as any).$lte)) return false
        if ('$gt' in v && !(val > (v as any).$gt)) return false
        if ('$lt' in v && !(val < (v as any).$lt)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (doc[k] === (v as any).$ne) return false
      } else if (typeof v === 'object' && v && ('$in' in v)) {
        if (!((v as any).$in as any[]).some((x) => String(x) === String(doc[k]))) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else if (typeof v === 'object' && v && ('$ne' in v)) {
        if (String(doc[k]) === String((v as any).$ne)) return false
      } else {
        if (String(doc[k]) !== String(v)) return false
      }
    }
    return true
  }

  function collection(name: string) {
    const data = cols[name] || []
    return {
      find(query: any = {}, _proj?: any) {
        let arr = data.filter((d) => match(d, query))
        const api = {
          sort(sortObj: Record<string, 1 | -1>) {
            const [[field, dir]] = Object.entries(sortObj)
            arr = arr.sort((a, b) => (a[field] > b[field] ? dir : -dir))
            return api
          },
          limit(n: number) {
            arr = arr.slice(0, n)
            return api
          },
          async next() {
            return arr[0] || null
          },
          async toArray() {
            return arr
          },
        }
        return api
      },
      async countDocuments(query: any = {}) {
        return data.filter((d) => match(d, query)).length
      },
      async findOne(query: any) {
        return data.find((d) => match(d, query)) || null
      },
      async updateOne(filter: any, update: any) {
        const doc = data.find((d) => match(d, filter))
        if (!doc) return { matchedCount: 0, modifiedCount: 0 }
        if (update && update.$set) {
          Object.assign(doc, update.$set)
        }
        return { matchedCount: 1, modifiedCount: 1 }
      },
      aggregate(pipeline: any[]) {
        // soporta sólo el group usado por countByTypes
        const stage = pipeline.find((s) => s.$group)
        if (stage && stage.$group._id === '$type') {
          const map: Record<string, number> = {}
          const arr = data.filter((d) => match(d, pipeline.find((s) => s.$match)?.$match || {}))
          for (const d of arr) map[d.type] = (map[d.type] || 0) + 1
          const out = Object.entries(map).map(([k, v]) => ({ _id: k, count: v }))
          return { toArray: async () => out }
        }
        return { toArray: async () => [] }
      },
      async insertOne(doc: Doc) {
        data.push({ _id: doc._id || `${name}-${data.length + 1}`, ...doc })
        return { insertedId: data[data.length - 1]._id }
      },
      async updateMany(_filter: any, _update: any) {
        return { matchedCount: 0, modifiedCount: 0 }
      },
      async createIndexes(_defs: any[]) { return undefined },
    }
  }

  return { collection }
}
