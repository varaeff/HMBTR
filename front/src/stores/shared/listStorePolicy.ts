export interface ListItemWithId {
  id: number
}

export interface SearchableListState {
  searchString: string
}

type SearchFieldSelector<TItem> = (item: TItem) => string | null | undefined
type DateSelector<TItem> = (item: TItem) => Date | string | null | undefined
type RemoteItemPredicate<TItem> = (item: TItem) => boolean

export const clearListSearch = (state: SearchableListState) => {
  state.searchString = ''
}

export const setListSearch = (state: SearchableListState, searchString: string) => {
  state.searchString = searchString
}

export const filterBySearch = <TItem>(
  items: TItem[],
  searchString: string,
  selectors: Array<SearchFieldSelector<TItem>>
) => {
  const query = searchString.toLowerCase()

  return items.filter((item) =>
    selectors.some((selector) => selector(item)?.toLowerCase().includes(query))
  )
}

export const hasLoadedRemoteList = <TItem>(
  items: TItem[],
  remoteCount: number,
  isRemoteItem: RemoteItemPredicate<TItem> = () => true
) => items.filter(isRemoteItem).length === remoteCount

export const mergeMissingById = <TItem extends ListItemWithId>(
  target: TItem[],
  incoming: TItem[]
) => {
  const existingIds = new Set(target.map((item) => item.id))
  target.push(...incoming.filter((item) => !existingIds.has(item.id)))
}

export const replaceById = <TItem extends ListItemWithId>(target: TItem[], item: TItem) => {
  const itemIndex = target.findIndex((targetItem) => targetItem.id === item.id)

  if (itemIndex < 0) {
    return false
  }

  target[itemIndex] = item
  return true
}

export const upsertById = <TItem extends ListItemWithId>(target: TItem[], item: TItem) => {
  if (!replaceById(target, item)) {
    target.push(item)
  }
}

export const getNextListId = <TItem extends ListItemWithId>(items: TItem[]) =>
  items.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1

export const sortByDateDesc = <TItem>(items: TItem[], selector: DateSelector<TItem>) =>
  [...items].sort((first, second) => {
    const firstTime = new Date(selector(first) ?? 0).getTime()
    const secondTime = new Date(selector(second) ?? 0).getTime()

    return secondTime - firstTime
  })

export const withFallback = <TItem>(items: TItem[], fallback: TItem) =>
  items.length > 0 ? items : [fallback]
