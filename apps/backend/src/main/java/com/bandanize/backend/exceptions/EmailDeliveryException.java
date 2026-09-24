package com.bandanize.backend.exceptions;
public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException() { super("Email could not be sent. Please try again later."); }
}
