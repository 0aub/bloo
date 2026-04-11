// Connection, CrossReference, BoardLink interfaces from SCHEMA.md

export interface ConnectionMetadata {
  protocol?: string;
  data_format?: string;
  async?: boolean;
  description?: string;
}

export interface Connection {
  id: string;
  from_element_id: string;
  to_element_id: string;
  label: string;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  arrow: 'forward' | 'backward' | 'both' | 'none';
  status: 'current' | 'stale';
  metadata: ConnectionMetadata;
  created_at: string;
  updated_at: string;
}

export interface CrossReference {
  id: string;
  from_element_id: string;
  to_element_id: string;
  relationship: string;
  description: string;
  bidirectional: boolean;
  created_at: string;
}

export interface BoardLink {
  id: string;
  target_board_id: string;
  label: string;
  description: string;
  element_id: string | null;
  created_at: string;
}
