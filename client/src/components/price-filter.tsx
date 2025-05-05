import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  FormControl,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

interface PriceFilterProps {
  isPaidOnly: boolean | null;
  onChangePaidStatus: (isPaid: boolean | null) => void;
  minGpa: number | null;
  onChangeMinGpa: (gpa: number | null) => void;
}

const PriceFilter = ({
  isPaidOnly,
  onChangePaidStatus,
  minGpa,
  onChangeMinGpa,
}: PriceFilterProps) => {
  const handlePaidStatusChange = (checked: boolean) => {
    if (checked) {
      onChangePaidStatus(true);
    } else {
      onChangePaidStatus(null);
    }
  };

  const handleGpaChange = (value: number[]) => {
    const gpa = value[0];
    onChangeMinGpa(gpa === 0 ? null : gpa);
  };

  return (
    <div className="space-y-4">
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <FormLabel>Paid Sessions Only</FormLabel>
        </div>
        <FormControl>
          <Switch
            checked={isPaidOnly === true}
            onCheckedChange={handlePaidStatusChange}
          />
        </FormControl>
      </FormItem>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Minimum GPA</Label>
          <span className="text-sm font-medium">
            {minGpa === null ? "No minimum" : minGpa.toFixed(1)}
          </span>
        </div>
        <Slider
          defaultValue={[minGpa || 0]}
          max={4}
          step={0.1}
          onValueChange={handleGpaChange}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>No min</span>
          <span>4.0</span>
        </div>
      </div>
    </div>
  );
};

export default PriceFilter;
