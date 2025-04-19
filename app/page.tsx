import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-col space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">ESMFold Lite</h1>
        <p className="text-muted-foreground">
          A lightweight interface for ESMFold protein structure prediction
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Predict Structure</CardTitle>
            <CardDescription>
              Upload a protein sequence to predict its 3D structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Prediction form will go here */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Predictions</CardTitle>
            <CardDescription>
              View your recent structure predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Recent predictions list will go here */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Configure your prediction parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Settings form will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 