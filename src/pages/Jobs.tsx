import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function Jobs() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    inputString: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement job submission logic
    console.log("Submitting job:", formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Submit New Job</h2>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Job Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter job name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter job description"
              className="h-24"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inputString">Input String</Label>
            <Textarea
              id="inputString"
              value={formData.inputString}
              onChange={(e) => setFormData({ ...formData, inputString: e.target.value })}
              placeholder="Enter input string"
              className="h-32 font-mono"
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Submit Job
          </Button>
        </form>
      </Card>
    </div>
  );
} 