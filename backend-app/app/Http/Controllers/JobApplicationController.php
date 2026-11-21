<?php
namespace App\Http\Controllers;
use App\Models\JobApplication;
use Illuminate\Http\Request;

class JobApplicationController extends Controller {
    private const STATUSES = 'applied,interviewing,offer,rejected';

    private function own(Request $r) {
        return JobApplication::where('user_id', $r->user()->id);
    }

    public function index(Request $r) {
        $q = $this->own($r)->latest();
        if ($s = $r->query('search')) {
            $q->where(fn($w) => $w->where('company', 'like', "%$s%")->orWhere('position', 'like', "%$s%"));
        }
        if ($st = $r->query('status')) $q->where('status', $st);
        return $q->paginate(20);
    }

    public function store(Request $r) {
        $data = $r->validate([
            'company' => 'required|string|max:255',
            'position' => 'required|string|max:255',
            'status' => 'in:' . self::STATUSES,
            'location' => 'nullable|string|max:255',
            'applied_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);
        return response()->json(JobApplication::create($data + ['user_id' => $r->user()->id]), 201);
    }

    public function show(Request $r, $id) { return $this->own($r)->findOrFail($id); }

    public function update(Request $r, $id) {
        $app = $this->own($r)->findOrFail($id);
        $data = $r->validate([
            'company' => 'sometimes|string|max:255',
            'position' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:' . self::STATUSES,
            'location' => 'nullable|string|max:255',
            'applied_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);
        $app->update($data);
        return $app;
    }

    public function destroy(Request $r, $id) {
        $this->own($r)->findOrFail($id)->delete();
        return response()->noContent();
    }

    public function stats(Request $r) {
        $by = $this->own($r)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        return ['total' => $by->sum(), 'by_status' => $by];
    }
}
