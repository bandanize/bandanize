package com.bandanize.backend.services;

public interface EmailService {
    void sendAccountDeleted(String to);

    void sendPasswordReset(String to, String token);

    void sendBandInvitation(String to, String bandName, String inviterName, String inviteLink);

    void sendVerificationEmail(String to, String token);
}
