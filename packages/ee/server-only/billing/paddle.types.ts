export type PaddleEntityResponse<TData> = {
  data: TData;
};

export type PaddleListResponse<TData> = {
  data: TData[];
  meta?: {
    pagination?: {
      has_more?: boolean;
      next?: string | null;
    };
  };
};

export type PaddleCustomer = {
  id: string;
  email: string;
  name?: string;
};

export type PaddleSubscription = {
  id: string;
  customer_id: string;
  status: string;
  next_billed_at?: string | null;
  scheduled_change?: {
    action?: string;
    effective_at?: string | null;
  } | null;
  items?: Array<{
    price?: {
      id?: string;
    };
  }>;
};

export type PaddleTransaction = {
  id: string;
  status?: string;
  created_at?: string;
  details?: {
    totals?: {
      grand_total?: string;
      currency_code?: string;
    };
    line_items?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
  receipt_url?: string | null;
  checkout?: {
    url?: string;
  };
  customer_id?: string;
  subscription_id?: string;
  custom_data?: Record<string, string>;
};
