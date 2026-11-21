<?php
namespace Database\Seeders;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::create([
            'name' => 'Demo User',
            'email' => 'demo@example.com',
            'password' => 'password123',
        ]);

        $rows = [
            ['Google', 'Frontend Engineer', 'interviewing', 'Remote'],
            ['Microsoft', 'Software Engineer Intern', 'applied', 'Colombo'],
            ['WSO2', 'Associate Software Engineer', 'offer', 'Colombo'],
            ['Amazon', 'Backend Developer', 'rejected', 'Remote'],
            ['Spotify', 'Mobile Developer', 'applied', 'Remote'],
            ['IFS', 'QA Engineer', 'interviewing', 'Colombo'],
        ];

        foreach ($rows as [$company, $position, $status, $location]) {
            JobApplication::create([
                'user_id' => $user->id,
                'company' => $company,
                'position' => $position,
                'status' => $status,
                'location' => $location,
                'applied_date' => now()->subDays(rand(1, 30)),
            ]);
        }
    }
}