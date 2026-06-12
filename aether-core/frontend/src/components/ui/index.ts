/**
 * AETHER Design System — canonical public API.
 * Import all UI primitives from `@/components/ui`.
 */
export { Button, buttonVariants, type ButtonProps } from './Button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
  type CardProps,
} from './Card';
export { InsightCard, type InsightCardProps } from './insight-card';
export { CommandBar, type CommandBarProps } from './command-bar';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export { ApprovalDialog, type ApprovalDialogProps } from './approval-dialog';
export { PageHeader, StatChip, type PageHeaderProps, type StatChipProps } from './page-header';
export { EmptyState, type EmptyStateProps } from './empty-state';
export { ErrorState, type ErrorStateProps } from './error-state';
export { TextField, type TextFieldProps } from './text-field';
export { SearchInput, type SearchInputProps } from './search-input';
export { Spinner, LoadingState, type SpinnerProps, type LoadingStateProps } from './loading';
export { Skeleton, type SkeletonProps, type SkeletonVariant } from './Skeleton';
export { CommandCenterSkeleton } from './skeletons/CommandCenterSkeleton';
export { ApprovalsPageSkeleton } from './skeletons/ApprovalsPageSkeleton';
export { InsightsPageSkeleton } from './skeletons/InsightsPageSkeleton';
export { ActivityPageSkeleton } from './skeletons/ActivityPageSkeleton';
export { ModuleListPageSkeleton } from './skeletons/ModuleListPageSkeleton';
export { OutcomesPageSkeleton } from './skeletons/OutcomesPageSkeleton';
export { AsyncBoundary, type AsyncBoundaryProps } from './async-boundary';
export {
  ConfidenceBadge,
  RiskBadge,
  ConfidenceChip,
  type ConfidenceBadgeProps,
  type RiskBadgeProps,
} from './confidence-badge';
export { default as CommandInput } from './CommandInput';
export { default as ActionRail } from './ActionRail';
export { default as MetricDelta } from './MetricDelta';
export { default as InsightState } from './InsightState';
export { Toaster } from './toaster';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover';
export { Switch, type SwitchProps } from './switch';
export { SettingRow, type SettingRowProps } from './setting-row';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from './segmented-control';
export {
  SettingsSectionNav,
  type SettingsSectionNavProps,
  type SettingsSectionItem,
} from './settings-section-nav';
export { RangeInput, type RangeInputProps } from './range-input';
export { TimeInput, type TimeInputProps } from './time-input';
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet';
