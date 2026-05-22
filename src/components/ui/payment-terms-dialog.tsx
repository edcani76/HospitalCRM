import { useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from './drawer'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { CalendarDays, Zap } from 'lucide-react'

interface PaymentTermsDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (dueDays: number) => void
}

const presets = [
  { label: 'Due Immediately', days: 0, icon: Zap },
  { label: '7 Days', days: 7, icon: CalendarDays },
  { label: '14 Days', days: 14, icon: CalendarDays },
  { label: '30 Days', days: 30, icon: CalendarDays },
]

export default function PaymentTermsDialog({ open, onClose, onConfirm }: PaymentTermsDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<number>(0)
  const [customDays, setCustomDays] = useState<string>('')
  const [useCustom, setUseCustom] = useState(false)

  const handleConfirm = () => {
    const days = useCustom ? parseInt(customDays) || 0 : selectedPreset
    onConfirm(Math.max(0, days))
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DrawerContent className="">
        <DrawerHeader>
          <DrawerTitle>Payment Terms</DrawerTitle>
          <DrawerDescription>
            Set the due date for this invoice. This determines when payment is expected.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 py-4">
          <p className="text-sm font-medium text-stone-700">Due Date</p>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => {
              const Icon = preset.icon
              const isSelected = selectedPreset === preset.days && !useCustom
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => { setSelectedPreset(preset.days); setUseCustom(false) }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-stone-700'}`}>
                    {preset.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-xs text-stone-400 font-medium">OR</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="custom-days" className="text-sm text-stone-600 whitespace-nowrap">
              Custom (days)
            </Label>
            <Input
              id="custom-days"
              type="number"
              min={0}
              placeholder="e.g. 45"
              value={customDays}
              onChange={(e) => { setCustomDays(e.target.value); setUseCustom(true); setSelectedPreset(0) }}
              className="w-24"
            />
            {useCustom && customDays && parseInt(customDays) > 0 && (
              <span className="text-xs text-stone-500">
                Due: {new Date(Date.now() + parseInt(customDays) * 86400000).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Confirm
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
