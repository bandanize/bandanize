package com.bandanize.backend.dtos;

import java.util.List;
import java.util.Map;

public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String name;
    private String city;
    private String photo;
    private Map<String, String> rrss;
    private List<Long> bandIds;

    // Getters y setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getPhoto() {
        return photo;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
    }

    public Map<String, String> getRrss() {
        return rrss;
    }

    public void setRrss(Map<String, String> rrss) {
        this.rrss = rrss;
    }

    public List<Long> getBandIds() {
        return bandIds;
    }

    public void setBandIds(List<Long> bandIds) {
        this.bandIds = bandIds;
    }
}