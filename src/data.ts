// Shape of the unchanged report payload returned by the server.
export interface BusinessNode {
  id: string;
  name: string;
  values: number[];
  branches?: BusinessNode[];
  employees?: BusinessNode[];
  channels?: BusinessNode[];
}
