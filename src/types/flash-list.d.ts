import { FlashListProps as _FlashListProps } from '@shopify/flash-list';

declare module '@shopify/flash-list' {
  export interface FlashListProps<TItem> extends _FlashListProps<TItem> {
    estimatedItemSize?: number;
  }
}