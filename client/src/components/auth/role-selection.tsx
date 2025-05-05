import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, GraduationCap } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface RoleSelectionProps {
  onRoleSelect: (role: 'learner' | 'tutor') => void;
}

const RoleSelection = ({ onRoleSelect }: RoleSelectionProps) => {
  const [selectedRole, setSelectedRole] = useState<'learner' | 'tutor' | null>(null);

  const handleRoleChange = (value: string) => {
    setSelectedRole(value as 'learner' | 'tutor');
  };

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Welcome to TutaLink</h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Are you looking to learn or teach? Choose your role to get started.</p>
        </div>
        <RadioGroup className="mt-5 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0" value={selectedRole || ''} onValueChange={handleRoleChange}>
          <div className={`relative bg-white border ${selectedRole === 'learner' ? 'border-primary-500' : 'border-gray-200'} rounded-lg shadow-sm p-4 flex flex-col cursor-pointer hover:border-primary-500 transition-colors`}>
            <div className="flex justify-between">
              <h3 className="text-lg font-medium text-gray-900">Join as a Learner</h3>
              <RadioGroupItem value="learner" id="learner" className="h-4 w-4" />
            </div>
            <p className="mt-1 text-sm text-gray-500">Find tutors to help with your coursework and academic goals.</p>
            <div className="mt-4">
              <Book className="h-12 w-12 text-primary-500" />
            </div>
            <Label htmlFor="learner" className="sr-only">Learner</Label>
          </div>

          <div className={`relative bg-white border ${selectedRole === 'tutor' ? 'border-primary-500' : 'border-gray-200'} rounded-lg shadow-sm p-4 flex flex-col cursor-pointer hover:border-primary-500 transition-colors`}>
            <div className="flex justify-between">
              <h3 className="text-lg font-medium text-gray-900">Join as a Tutor</h3>
              <RadioGroupItem value="tutor" id="tutor" className="h-4 w-4" />
            </div>
            <p className="mt-1 text-sm text-gray-500">Share your knowledge and help others while earning.</p>
            <div className="flex-grow flex items-end mt-4">
              <GraduationCap className="h-12 w-12 text-primary-500" />
            </div>
            <Label htmlFor="tutor" className="sr-only">Tutor</Label>
          </div>
        </RadioGroup>
        <div className="mt-5">
          <Button onClick={handleContinue} disabled={!selectedRole}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleSelection;
