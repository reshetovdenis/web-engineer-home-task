// Shape of the report payload returned by the server. Lazy report responses may
// omit child collections and use the hierarchy metadata to indicate that those
// children can be fetched on demand.
export interface BusinessNode {
  id: string;
  name: string;
  values: number[];
  branches?: BusinessNode[];
  employees?: BusinessNode[];
  channels?: BusinessNode[];
  hasChildren?: boolean;
  childrenLoaded?: boolean;
  childCount?: number;
}
