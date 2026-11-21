<?php
namespace App\Http\Controllers;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller {
    public function register(Request $r) {
        $data = $r->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
        ]);
        $user = User::create($data); // password is hashed by the User model cast
        return ['token' => $user->createToken('app')->plainTextToken, 'user' => $user];
    }

    public function login(Request $r) {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required']);
        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials']]);
        }
        return ['token' => $user->createToken('app')->plainTextToken, 'user' => $user];
    }

    public function logout(Request $r) {
        $r->user()->currentAccessToken()->delete();
        return response()->noContent();
    }
}
