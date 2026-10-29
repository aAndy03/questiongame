import { Label, Slider } from '@heroui/react'
import { Text } from './Text'
import { DisabledReason } from './Tooltip'
import { defined } from './props'

export interface SliderFieldProps {
  label: string
  hideLabel?: boolean | undefined
  value: number
  onChange: (value: number) => void
  onChangeEnd?: ((value: number) => void) | undefined
  minValue?: number
  maxValue?: number
  step?: number
  isDisabled?: boolean | undefined
  disabledReason?: string | null | undefined
  formatOptions?: Intl.NumberFormatOptions | undefined
  /** One line under the slider: what the number means (beta.13). */
  description?: string | null | undefined
  className?: string | undefined
}

export function SliderField({
  label,
  hideLabel,
  value,
  onChange,
  onChangeEnd,
  minValue = 0,
  maxValue = 100,
  step = 1,
  isDisabled,
  disabledReason,
  formatOptions,
  description,
  className,
}: SliderFieldProps) {
  const disabled = Boolean(isDisabled) || Boolean(disabledReason)
  const one = (v: number | number[]) => (Array.isArray(v) ? (v[0] ?? minValue) : v)
  const field = (
    <Slider
      value={value}
      onChange={(v) => onChange(one(v))}
      {...defined({
        onChangeEnd: onChangeEnd ? (v: number | number[]) => onChangeEnd(one(v)) : undefined,
        formatOptions,
        className,
        'aria-label': hideLabel ? label : undefined,
      })}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      isDisabled={disabled}
    >
      {hideLabel ? null : <Label>{label}</Label>}
      {hideLabel ? null : <Slider.Output />}
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  )
  const wrapped = <DisabledReason reason={disabled ? disabledReason : null} block>{field}</DisabledReason>
  if (!description) return wrapped
  return (
    <div className="flex flex-col gap-1">
      {wrapped}
      <Text variant="studio-caption" tone="muted">
        {description}
      </Text>
    </div>
  )
}
