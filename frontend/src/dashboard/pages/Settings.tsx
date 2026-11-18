import { useState } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaKey,
  FaEnvelope,
  FaUserTag,
  FaShieldAlt,
  FaWhatsapp,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { useForm } from "react-hook-form";
import {
  useChangePasswordMutation,
  useChangeEmailMutation,
  useChangeUsernameMutation,
} from "../../redux/api/api";
import { useSavePhoneMutation, useSaveNameMutation } from "../../redux/api/chatApi";
import { removeUserLocalStorage, setUserLocalStorage, useUserVerification } from "../../auth/auth";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();
  const user = useUserVerification();
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");

  const [changePassword, { isLoading: isPasswordLoading }] =
    useChangePasswordMutation();
  const [changeEmail, { isLoading: isEmailLoading }] = useChangeEmailMutation();
  const [changeUsername, { isLoading: isUsernameLoading }] =
    useChangeUsernameMutation();
  const [savePhone, { isLoading: isPhoneLoading }] = useSavePhoneMutation();
  const [saveName, { isLoading: isNameLoading }] = useSaveNameMutation();
  const [displayName, setDisplayName] = useState(user?.name || "");

  const passwordForm = useForm<{
    currentPassword: string;
    newPassword: string;
  }>();
  const emailForm = useForm<{ email: string }>();
  const usernameForm = useForm<{ username: string }>();

  const handleChangePassword = async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      const res = await changePassword(data);
      if (res?.error) {
        toast.error(getErrorMessage(res.error, "Failed to change password."));
        return;
      }
      if (res?.data?.statusCode === 200) {
        toast.success("Password changed successfully!");
        passwordForm.reset();
      }
    } catch {
      toast.error("Failed to change password.");
    }
  };

  const handleChangeEmail = async (data: { email: string }) => {
    try {
      const res = await changeEmail(data);
      if (res?.error) {
        toast.error(getErrorMessage(res.error, "Failed to change email."));
        return;
      }
      if (res?.data?.statusCode === 200) {
        toast.success("Email changed! Please log in again.");
        emailForm.reset();
        removeUserLocalStorage();
        navigate("/login");
      }
    } catch {
      toast.error("Failed to change email.");
    }
  };

  const handleChangeUsername = async (data: { username: string }) => {
    try {
      const res = await changeUsername(data);
      if (res?.error) {
        toast.error(getErrorMessage(res.error, "Failed to change username."));
        return;
      }
      if (res?.data?.statusCode === 200) {
        toast.success("Username changed! Please log in again.");
        usernameForm.reset();
        removeUserLocalStorage();
        navigate("/login");
      }
    } catch {
      toast.error("Failed to change username.");
    }
  };

  const accountFields = [
    { label: "Username", value: user?.username || "—" },
    { label: "Email", value: user?.email || "—" },
    {
      label: "Role",
      value: user?.role
        ? user.role === "ADMIN"
          ? "Administrator"
          : "Member"
        : "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-ink-mute">
          Manage your login credentials and profile details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account info */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-3 text-xl font-bold text-ink">
                {user?.username?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">
                  {user?.name || user?.username || "User"}
                </p>
                <p className="text-sm text-ink-mute">{user?.role}</p>
              </div>
            </div>

            <div className="space-y-3">
              {accountFields.map((field) => (
                <div
                  key={field.label}
                  className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3"
                >
                  <span className="text-sm text-ink-mute">{field.label}</span>
                  <span className="text-sm font-medium text-ink">
                    {field.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-dim">
              <FaShieldAlt className="mt-0.5 flex-shrink-0 text-ok" />
              <p>
                Changing your email or username signs you out so you can log in
                with the new details.
              </p>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Display name */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <FaUserTag className="text-accent" />
              <h2 className="text-lg font-semibold text-ink">Display Name</h2>
            </div>
            <p className="mb-4 text-sm text-ink-dim">
              Shown next to your activity instead of your real name. Set
              something anonymous — a nickname or handle works great.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="field flex-1"
                placeholder="e.g. anonymous_scholar"
                maxLength={60}
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await saveName(displayName).unwrap();
                    if (res?.data?.token) {
                      setUserLocalStorage(res.data.token);
                    }
                    toast.success(
                      displayName.trim()
                        ? "Display name saved!"
                        : "Display name cleared."
                    );
                  } catch (err: any) {
                    toast.error(
                      getErrorMessage(err, "Failed to save your display name.")
                    );
                  }
                }}
                disabled={isNameLoading}
                className="btn btn-brand sm:w-36"
              >
                {isNameLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* WhatsApp Number */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <FaWhatsapp className="text-lg text-emerald-400" />
              <h2 className="text-lg font-semibold text-ink">
                WhatsApp Number
              </h2>
            </div>
            <p className="mb-4 text-sm text-ink-dim">
              Optional. If you share it, people who see your listed items get a
              "Chat on WhatsApp" button that opens a chat with you. Leave it
              blank to stay on-platform only.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field flex-1"
                placeholder="e.g. 0772 123 4567"
                maxLength={20}
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await savePhone(phone).unwrap();
                    if (res?.success === false) {
                      toast.error("Failed to save your phone number.");
                      return;
                    }
                    toast.success(
                      phone.trim()
                        ? "WhatsApp number saved!"
                        : "Phone number removed."
                    );
                  } catch (err: any) {
                    toast.error(
                      getErrorMessage(err, "Failed to save your phone number.")
                    );
                  }
                }}
                disabled={isPhoneLoading}
                className="btn btn-brand sm:w-36"
              >
                {isPhoneLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <FaKey className="text-accent" />
              <h2 className="text-lg font-semibold text-ink">
                Change Password
              </h2>
            </div>

            <form
              onSubmit={passwordForm.handleSubmit(handleChangePassword)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="field-label"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      {...passwordForm.register("currentPassword", {
                        required: "Current password is required",
                      })}
                      className="field pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute transition-colors hover:text-ink"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <FaEyeSlash className="h-4 w-4" />
                      ) : (
                        <FaEye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="field-error">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="field-label"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register("newPassword", {
                      required: "New password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    className="field"
                    placeholder="Enter new password"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="field-error">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPasswordLoading}
                className="btn btn-primary"
              >
                {isPasswordLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>

          {/* Change Email */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <FaEnvelope className="text-ok" />
              <h2 className="text-lg font-semibold text-ink">Change Email</h2>
            </div>

            <form
              onSubmit={emailForm.handleSubmit(handleChangeEmail)}
              className="space-y-4"
            >
              <div className="max-w-md">
                <label
                  htmlFor="changeEmail"
                  className="field-label"
                >
                  New Email Address
                </label>
                <input
                  id="changeEmail"
                  type="email"
                  {...emailForm.register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: "Invalid email address",
                    },
                  })}
                  className="field"
                  placeholder="Enter new email address"
                />
                {emailForm.formState.errors.email && (
                  <p className="field-error">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isEmailLoading}
                className="btn btn-primary"
              >
                {isEmailLoading ? "Changing..." : "Change Email"}
              </button>
            </form>
          </div>

          {/* Change Username */}
          <div className="card p-6">
            <div className="mb-5 flex items-center gap-3">
              <FaUserTag className="text-indigo-300" />
              <h2 className="text-lg font-semibold text-ink">
                Change Username
              </h2>
            </div>

            <form
              onSubmit={usernameForm.handleSubmit(handleChangeUsername)}
              className="space-y-4"
            >
              <div className="max-w-md">
                <label
                  htmlFor="changeUsername"
                  className="field-label"
                >
                  New Username
                </label>
                <input
                  id="changeUsername"
                  type="text"
                  {...usernameForm.register("username", {
                    required: "Username is required",
                    minLength: {
                      value: 3,
                      message: "Username must be at least 3 characters",
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message:
                        "Username can only contain letters, numbers, and underscores",
                    },
                  })}
                  className="field"
                  placeholder="Enter new username"
                />
                {usernameForm.formState.errors.username && (
                  <p className="field-error">
                    {usernameForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isUsernameLoading}
                className="btn btn-primary"
              >
                {isUsernameLoading ? "Changing..." : "Change Username"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
